import { createLazyClient } from "./client";


const supabase = createLazyClient()

export async function createUser(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { 
                display_name: displayName 
            }
        },
    })

    if (error) {
        console.error("Error creating user:", error.message);
        throw new Error(error.message);
    }

    return data.user
}