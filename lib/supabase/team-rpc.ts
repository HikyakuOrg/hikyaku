import { createLazyClient } from "./client"

const supabase = createLazyClient();

export interface ListTeamMemberDto {
    id: string;
    email: string;
    phone_number: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    email_confirmed_at: string | null;
    is_admin: boolean;
    page_number?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
}

export interface CreateTeamMemberDto {
    email: string;
    displayName: string;
    phoneNumber?: string;
    permissions: string[];
}

export async function getTeamMembers(page: number, pageSize: number, search?: string) {
    const { data, error } = await supabase.rpc("get_team_members_paginated", {
        p_page: page,
        p_limit: pageSize,
        p_search: search || undefined,
    });

    if (error) throw error;
    if (!data) return [];
    return data as ListTeamMemberDto[];
}