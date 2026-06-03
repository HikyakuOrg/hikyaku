


interface Customer {
    organisation_id: string;
    customer_address: string;
    customer_country: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_postcode: string;
    customer_suburb: string;
    customer_state: string;
    customer_location: Point;
    geocode_confidence?: number | null;
    pelias_gid?: string | null;
    pelias_raw?: unknown | null;
    stripe_customer_id?: string | null;
    created_at: string;
    id: string;
}