import { createClient } from "./client";

const supabase = createClient()

export async function addAvatar(userId: string, file: File) {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}.${fileExtension}`;
    const fileBuffer = await file.arrayBuffer()
    const { data, error } = await supabase.storage
        .from('avatar')
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: true,
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('avatar').getPublicUrl(fileName);

    return publicUrlData.publicUrl;

}

export async function addVehicleImages(vehicleId: string, files: File[]) {

    const uploadPromises = files.map(async (file) => {
        const fileExtension = file.name.split('.').pop()
        const fileName = `${vehicleId}/${crypto.randomUUID()}.${fileExtension}`

        const { error } = await supabase.storage
            .from('vehicles')
            .upload(fileName, file, {
                contentType: file.type,
            })

        if (error) throw error

        return fileName
    })

    return await Promise.all(uploadPromises)
}


export async function listVehicleFiles(vehicleId: string) {
    const { data, error } = await supabase.storage.from('vehicles').list(vehicleId)
    if (error) throw error
    return data
}

export async function getSignedUrls(paths: string[]) {
    const { data, error } = await supabase
        .storage
        .from('vehicles')
        .createSignedUrls(paths, 60)

    if (error) throw error

    return data.map((d) => d.signedUrl)
}

export async function listPackageFiles(packageId: string) {
    const { data, error } = await supabase.storage.from('packages').list(packageId)
    if (error) throw error
    return data
}

export async function getPackageSignedUrls(paths: string[]) {
    const { data, error } = await supabase
        .storage
        .from('packages')
        .createSignedUrls(paths, 60)

    if (error) throw error

    return data.map((d) => d.signedUrl)
}