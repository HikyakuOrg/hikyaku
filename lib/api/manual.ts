/**
 * Shapes the OpenAPI spec does not describe. Keep this file small. When the
 * spec adds a shape, delete it here and use the generated DTO.
 */

/**
 * A driver row from the Supabase RPCs in `lib/supabase/supabase-rpc.ts`. Not an
 * API DTO: driver reads go to Postgres, so this follows the RPC columns.
 */
export interface ListDriverDto {
  id: string
  email: string
  avatar_url: string | null
  phone_number: string
  display_name: string
  driver_license: string | null
  license_expiry: string | null
  vehicle_id?: string
  vehicle_plate?: string
  vehicle_make?: string
  vehicle_model?: string
}

