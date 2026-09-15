#!/usr/bin/env node
// Creates/lists/removes git worktrees for parallel agents, each pinned to its
// own dev-server port. Keeps a small registry so ports never collide.
//
// Why this exists: this app resolves tenants from the Host header, and
// NEXT_PUBLIC_ROOT_DOMAIN (e.g. "localhost:3000") bakes the port in — so two
// agents can't just run `next dev` on different ports without also updating
// that env var (and PLAYWRIGHT_BASE_URL for Playwright). This script keeps
// port + env files + .claude/launch.json in sync per worktree.
//
// Usage:
//   node scripts/agent-worktree.mjs new <name> [--base <branch>] [--port <port>]
//   node scripts/agent-worktree.mjs list
//   node scripts/agent-worktree.mjs remove <name> [--force] [--delete-branch]

import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE_PORT = 3000;

function git(args, cwd) {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function findMainWorktreeRoot() {
    const out = execFileSync("git", ["worktree", "list", "--porcelain"], {
        cwd: process.cwd(),
        encoding: "utf8",
    });
    const firstLine = out.split(/\r?\n/).find((l) => l.startsWith("worktree "));
    if (!firstLine) throw new Error("Could not determine main git worktree.");
    return firstLine.slice("worktree ".length).trim();
}

function loadRegistry(mainRoot) {
    const file = path.join(mainRoot, ".claude", "agent-ports.json");
    if (!existsSync(file)) {
        return {
            file,
            data: {
                agents: {
                    main: { port: BASE_PORT, path: ".", branch: git(["branch", "--show-current"], mainRoot) },
                },
            },
        };
    }
    return { file, data: JSON.parse(readFileSync(file, "utf8")) };
}

function saveRegistry(registry) {
    mkdirSync(path.dirname(registry.file), { recursive: true });
    writeFileSync(registry.file, JSON.stringify(registry.data, null, 2) + "\n");
}

function usedPorts(data) {
    return new Set(Object.values(data.agents).map((a) => a.port));
}

function isPortFree(port) {
    return new Promise((resolve) => {
        const server = createServer();
        server.once("error", () => resolve(false));
        server.listen(port, () => server.close(() => resolve(true)));
    });
}

async function nextFreePort(data) {
    const taken = usedPorts(data);
    let port = BASE_PORT + 1;
    while (taken.has(port) || !(await isPortFree(port))) port++;
    return port;
}

function writeEnvFile(srcPath, destPath, replacements) {
    if (!existsSync(srcPath)) {
        console.warn(`  (skipped ${path.basename(destPath)}: no ${path.basename(srcPath)} in main worktree)`);
        return;
    }
    let content = readFileSync(srcPath, "utf8");
    for (const [key, value] of Object.entries(replacements)) {
        const re = new RegExp(`^${key}=.*$`, "m");
        if (re.test(content)) {
            content = content.replace(re, `${key}=${value}`);
        } else {
            content += `\n${key}=${value}\n`;
        }
    }
    writeFileSync(destPath, content);
}

function writeLaunchJson(worktreeRoot, port) {
    const launchPath = path.join(worktreeRoot, ".claude", "launch.json");
    mkdirSync(path.dirname(launchPath), { recursive: true });
    const config = {
        version: "0.0.1",
        configurations: [
            {
                name: "dev",
                runtimeExecutable: "pnpm",
                runtimeArgs: ["dev", "--", "-p", String(port)],
                port,
            },
        ],
    };
    writeFileSync(launchPath, JSON.stringify(config, null, 2) + "\n");
}

async function cmdNew(name, opts) {
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
        throw new Error(`Invalid agent name "${name}" — use letters, digits, - or _.`);
    }
    const mainRoot = findMainWorktreeRoot();
    const registry = loadRegistry(mainRoot);

    if (registry.data.agents[name]) {
        const existing = registry.data.agents[name];
        console.log(`Agent "${name}" already exists: port ${existing.port} at ${existing.path}`);
        return;
    }

    const port = opts.port ? Number(opts.port) : await nextFreePort(registry.data);
    if (usedPorts(registry.data).has(port)) {
        throw new Error(`Port ${port} is already assigned to another agent.`);
    }

    const worktreeDirName = `${path.basename(mainRoot)}-${name}`;
    const worktreePath = path.resolve(mainRoot, "..", worktreeDirName);
    const branch = `agent/${name}`;
    const base = opts.base ?? git(["branch", "--show-current"], mainRoot);

    console.log(`Creating worktree at ${worktreePath} (branch ${branch} from ${base})...`);
    execFileSync("git", ["worktree", "add", worktreePath, "-b", branch, base], {
        cwd: mainRoot,
        stdio: "inherit",
    });

    console.log(`Writing env files for port ${port}...`);
    writeEnvFile(path.join(mainRoot, ".env.local"), path.join(worktreePath, ".env.local"), {
        NEXT_PUBLIC_ROOT_DOMAIN: `localhost:${port}`,
    });
    writeEnvFile(path.join(mainRoot, ".env.test"), path.join(worktreePath, ".env.test"), {
        NEXT_PUBLIC_ROOT_DOMAIN: `localhost:${port}`,
        PLAYWRIGHT_BASE_URL: `http://localhost:${port}`,
    });

    writeLaunchJson(worktreePath, port);

    registry.data.agents[name] = { port, path: path.relative(mainRoot, worktreePath), branch };
    saveRegistry(registry);

    console.log(`\nAgent "${name}" ready:`);
    console.log(`  path:   ${worktreePath}`);
    console.log(`  branch: ${branch}`);
    console.log(`  port:   ${port}`);
    console.log(`\nNext steps in that worktree:`);
    console.log(`  pnpm install`);
    console.log(`  pnpm dev -- -p ${port}`);
}

function cmdList() {
    const mainRoot = findMainWorktreeRoot();
    const registry = loadRegistry(mainRoot);
    const rows = Object.entries(registry.data.agents).map(([name, a]) => ({
        name,
        port: a.port,
        branch: a.branch,
        path: a.path,
    }));
    rows.sort((a, b) => a.port - b.port);
    for (const r of rows) {
        console.log(`${String(r.port).padEnd(6)} ${r.name.padEnd(20)} ${r.branch.padEnd(24)} ${r.path}`);
    }
}

function cmdRemove(name, opts) {
    if (name === "main") throw new Error("Refusing to remove the main worktree.");
    const mainRoot = findMainWorktreeRoot();
    const registry = loadRegistry(mainRoot);
    const entry = registry.data.agents[name];
    if (!entry) throw new Error(`No agent named "${name}" in registry.`);

    const worktreePath = path.resolve(mainRoot, entry.path);
    const args = ["worktree", "remove", worktreePath];
    if (opts.force) args.push("--force");
    console.log(`Removing worktree ${worktreePath}...`);
    execFileSync("git", args, { cwd: mainRoot, stdio: "inherit" });

    if (opts.deleteBranch) {
        console.log(`Deleting branch ${entry.branch}...`);
        execFileSync("git", ["branch", "-D", entry.branch], { cwd: mainRoot, stdio: "inherit" });
    }

    delete registry.data.agents[name];
    saveRegistry(registry);
    console.log(`Freed port ${entry.port}.`);
}

function parseFlags(argv) {
    const opts = {};
    const positional = [];
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--base") opts.base = argv[++i];
        else if (arg === "--port") opts.port = argv[++i];
        else if (arg === "--force") opts.force = true;
        else if (arg === "--delete-branch") opts.deleteBranch = true;
        else positional.push(arg);
    }
    return { opts, positional };
}

async function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    const { opts, positional } = parseFlags(rest);

    if (cmd === "new") {
        const [name] = positional;
        if (!name) throw new Error("Usage: agent-worktree.mjs new <name> [--base <branch>] [--port <port>]");
        await cmdNew(name, opts);
    } else if (cmd === "list") {
        cmdList();
    } else if (cmd === "remove") {
        const [name] = positional;
        if (!name) throw new Error("Usage: agent-worktree.mjs remove <name> [--force] [--delete-branch]");
        cmdRemove(name, opts);
    } else {
        console.error("Usage: agent-worktree.mjs <new|list|remove> ...");
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
