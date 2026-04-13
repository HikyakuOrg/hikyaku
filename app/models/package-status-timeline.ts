import { PackageStatus } from "./package-status";



export interface PackageStatusTimeline {
    id: string;
    label: string;
    createdAt: string;
    statusText: string;
    status: PackageStatus
}