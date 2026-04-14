-- Add is_deleted column to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create trigger function for business rules on soft delete
-- Rules: Prevent delete if driver assigned, or if shifts are ongoing/scheduled
CREATE OR REPLACE FUNCTION public.check_vehicle_soft_deletion_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check rules if is_deleted is being set to true
    IF (NEW.is_deleted = true AND OLD.is_deleted = false) THEN
        -- Rule 1: Cannot delete if a driver is attached to the vehicle
        IF EXISTS (
            SELECT 1 FROM public.driver_vehicle_assignment 
            WHERE vehicle_id = OLD.id
        ) THEN
            RAISE EXCEPTION 'Cannot delete vehicle: active driver assignment exists.';
        END IF;

        -- Rule 2: Cannot delete if a shift is scheduled
        IF EXISTS (
            SELECT 1 
            FROM public.package_assignment pa
            JOIN public.package_delivery_window pdw ON pa.package_id = pdw.package_id
            WHERE pa.vehicle_id = OLD.id 
            AND pdw.scheduled_departure > NOW()
            AND pdw.actual_departure IS NULL
        ) THEN
            RAISE EXCEPTION 'Cannot delete vehicle: it has a scheduled shift.';
        END IF;

        -- Rule 3: Cannot delete if a shift is ongoing
        IF EXISTS (
            SELECT 1 
            FROM public.package_assignment pa
            JOIN public.package_delivery_window pdw ON pa.package_id = pdw.package_id
            WHERE pa.vehicle_id = OLD.id 
            AND pdw.actual_departure IS NOT NULL 
            AND pdw.actual_arrival IS NULL
        ) THEN
            RAISE EXCEPTION 'Cannot delete vehicle: it has an ongoing shift.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to vehicles table
DROP TRIGGER IF EXISTS tr_check_vehicle_soft_deletion_rules ON public.vehicles;
CREATE TRIGGER tr_check_vehicle_soft_deletion_rules
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.check_vehicle_soft_deletion_rules();
