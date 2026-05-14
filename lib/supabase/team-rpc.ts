import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "./supabase"
import { createClient } from "./client"

const supabase = createClient();

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
        p_search: search || null,
    });

    if (error) throw error;
    if (!data) return [];
    return data as ListTeamMemberDto[];
}

export async function addTeamMember(createDto: CreateTeamMemberDto, supabaseClient?: SupabaseClient<Database>) {
    // const client = supabaseClient ?? supabase;
    // const { data, error } = await client.rpc('create_team_member', {
    //     p_email: createDto.email,
    //     p_display_name: createDto.displayName,
    //     p_phone: createDto.phoneNumber,
    //     p_permissions: createDto.permissions
    // });

    // if (error) throw error;
    // return data;
}
