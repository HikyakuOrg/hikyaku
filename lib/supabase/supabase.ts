export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_permission: {
        Row: {
          id: number
          permission: string
        }
        Insert: {
          id?: number
          permission: string
        }
        Update: {
          id?: number
          permission?: string
        }
        Relationships: []
      }
      customer: {
        Row: {
          created_at: string
          customer_address: string
          customer_country: string
          customer_location: unknown
          customer_name: string
          customer_phone: string
          customer_postcode: string
          customer_state: string
          customer_suburb: string
          id: string
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_country: string
          customer_location: unknown
          customer_name: string
          customer_phone: string
          customer_postcode: string
          customer_state?: string
          customer_suburb: string
          id?: string
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_country?: string
          customer_location?: unknown
          customer_name?: string
          customer_phone?: string
          customer_postcode?: string
          customer_state?: string
          customer_suburb?: string
          id?: string
        }
        Relationships: []
      }
      driver_current_location: {
        Row: {
          driver_id: string
          location: unknown
          speed: number
          updated_at: string
        }
        Insert: {
          driver_id: string
          location: unknown
          speed: number
          updated_at?: string
        }
        Update: {
          driver_id?: string
          location?: unknown
          speed?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_location_history: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          location: unknown
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          location: unknown
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          location?: unknown
        }
        Relationships: []
      }
      driver_vehicle_assignment: {
        Row: {
          assigned_at: string
          driver_id: string
          id: string
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          driver_id: string
          id?: string
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          driver_id?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_assignment_driver_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignment_vehicle_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          driver_license: string | null
          id: string
          license_expiry: string | null
          warehouse_id: string | null
        }
        Insert: {
          driver_license?: string | null
          id: string
          license_expiry?: string | null
          warehouse_id?: string | null
        }
        Update: {
          driver_license?: string | null
          id?: string
          license_expiry?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
      package_assignment: {
        Row: {
          created_at: string
          driver_id: string
          package_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          package_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          package_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_assignment_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignment_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignment_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages_with_latest_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignment_vehicle_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_delivery_window: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          package_id: string
          scheduled_arrival: string | null
          scheduled_departure: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          package_id?: string
          scheduled_arrival?: string | null
          scheduled_departure?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          package_id?: string
          scheduled_arrival?: string | null
          scheduled_departure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_delivery_window_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_delivery_window_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages_with_latest_status"
            referencedColumns: ["id"]
          },
        ]
      }
      package_dimensions: {
        Row: {
          height_cm: number
          length_cm: number
          package_id: string
          weight_kg: number
          width_cm: number
        }
        Insert: {
          height_cm: number
          length_cm: number
          package_id: string
          weight_kg: number
          width_cm: number
        }
        Update: {
          height_cm?: number
          length_cm?: number
          package_id?: string
          weight_kg?: number
          width_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_dimensions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_dimensions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages_with_latest_status"
            referencedColumns: ["id"]
          },
        ]
      }
      package_failure: {
        Row: {
          created_at: string
          failure_reason: string
          id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          failure_reason: string
          id?: string
          package_id: string
        }
        Update: {
          created_at?: string
          failure_reason?: string
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_failure_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_failure_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages_with_latest_status"
            referencedColumns: ["id"]
          },
        ]
      }
      package_proof_of_delivery: {
        Row: {
          created_at: string
          file_url: string | null
          id: number
          location: unknown
          metadata: Json | null
          package_id: string
          pod_type_id: number
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: never
          location?: unknown
          metadata?: Json | null
          package_id: string
          pod_type_id: number
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: never
          location?: unknown
          metadata?: Json | null
          package_id?: string
          pod_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_proof_of_delivery_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_proof_of_delivery_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages_with_latest_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_proof_of_delivery_pod_type_id_fkey"
            columns: ["pod_type_id"]
            isOneToOne: false
            referencedRelation: "pod_type"
            referencedColumns: ["id"]
          },
        ]
      }
      package_status: {
        Row: {
          enums: string
          id: number
          status: string
        }
        Insert: {
          enums: string
          id?: number
          status: string
        }
        Update: {
          enums?: string
          id?: number
          status?: string
        }
        Relationships: []
      }
      package_timeline: {
        Row: {
          created_at: string
          id: number
          package_id: string
          package_status: number
        }
        Insert: {
          created_at?: string
          id?: number
          package_id: string
          package_status: number
        }
        Update: {
          created_at?: string
          id?: number
          package_id?: string
          package_status?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_timeline_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_timeline_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages_with_latest_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_timeline_package_status_fkey"
            columns: ["package_status"]
            isOneToOne: false
            referencedRelation: "package_status"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          delivery_notes: string | null
          from_customer: string
          id: string
          optimisation_id: string | null
          to_customer: string
          tracking_number: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_notes?: string | null
          from_customer: string
          id?: string
          optimisation_id?: string | null
          to_customer: string
          tracking_number: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_notes?: string | null
          from_customer?: string
          id?: string
          optimisation_id?: string | null
          to_customer?: string
          tracking_number?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_from_customer_fkey"
            columns: ["from_customer"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_optimisation_id_fkey"
            columns: ["optimisation_id"]
            isOneToOne: false
            referencedRelation: "vrp_optimization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_to_customer_fkey"
            columns: ["to_customer"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
      pod_type: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: never
          name: string
        }
        Update: {
          description?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      scheduler_runs: {
        Row: {
          id: string
          ran_at: string
          run_date: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          ran_at?: string
          run_date?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          ran_at?: string
          run_date?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_runs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          geometry: unknown
          id: string
          name: string
        }
        Insert: {
          geometry: unknown
          id?: string
          name: string
        }
        Update: {
          geometry?: unknown
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_permission: {
        Row: {
          permission_id: number
          user_id: string
        }
        Insert: {
          permission_id: number
          user_id: string
        }
        Update: {
          permission_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "app_permission"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_type: {
        Row: {
          id: string
          ors_vehicle_type: string
          vehicle_description: string | null
          vehicle_type: string
        }
        Insert: {
          id?: string
          ors_vehicle_type: string
          vehicle_description?: string | null
          vehicle_type: string
        }
        Update: {
          id?: string
          ors_vehicle_type?: string
          vehicle_description?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          is_deleted: boolean
          vehicle_gross_limits: number
          vehicle_identification_number: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_type: string
          vehicle_year: number
          warehouse_id: string | null
        }
        Insert: {
          id?: string
          is_deleted?: boolean
          vehicle_gross_limits: number
          vehicle_identification_number?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type: string
          vehicle_year: number
          warehouse_id?: string | null
        }
        Update: {
          id?: string
          is_deleted?: boolean
          vehicle_gross_limits?: number
          vehicle_identification_number?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string
          vehicle_year?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_vehicle_type_fkey"
            columns: ["vehicle_type"]
            isOneToOne: false
            referencedRelation: "vehicle_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
      vrp_optimization: {
        Row: {
          created_at: string
          id: string
          provider: string
          request: Json
          response: Json
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          request: Json
          response: Json
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          request?: Json
          response?: Json
        }
        Relationships: []
      }
      vrp_route: {
        Row: {
          amount: number[] | null
          cost: number | null
          delivery: number[] | null
          duration: number | null
          id: string
          pickup: number[] | null
          priority: number | null
          service: number | null
          setup: number | null
          solution_id: string
          waiting_time: number | null
        }
        Insert: {
          amount?: number[] | null
          cost?: number | null
          delivery?: number[] | null
          duration?: number | null
          id?: string
          pickup?: number[] | null
          priority?: number | null
          service?: number | null
          setup?: number | null
          solution_id: string
          waiting_time?: number | null
        }
        Update: {
          amount?: number[] | null
          cost?: number | null
          delivery?: number[] | null
          duration?: number | null
          id?: string
          pickup?: number[] | null
          priority?: number | null
          service?: number | null
          setup?: number | null
          solution_id?: string
          waiting_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vrp_route_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "vrp_solution"
            referencedColumns: ["id"]
          },
        ]
      }
      vrp_route_step: {
        Row: {
          arrival: number | null
          duration: number | null
          id: number
          load: number[] | null
          location: unknown
          package_id: string | null
          route_id: string
          service: number | null
          setup: number | null
          solution_id: string
          step_index: number
          type: string
          waiting_time: number | null
        }
        Insert: {
          arrival?: number | null
          duration?: number | null
          id?: number
          load?: number[] | null
          location?: unknown
          package_id?: string | null
          route_id: string
          service?: number | null
          setup?: number | null
          solution_id: string
          step_index: number
          type: string
          waiting_time?: number | null
        }
        Update: {
          arrival?: number | null
          duration?: number | null
          id?: number
          load?: number[] | null
          location?: unknown
          package_id?: string | null
          route_id?: string
          service?: number | null
          setup?: number | null
          solution_id?: string
          step_index?: number
          type?: string
          waiting_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vrp_route_step_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "package_assignment"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "vrp_route_step_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "vrp_route"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vrp_route_step_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "vrp_solution"
            referencedColumns: ["id"]
          },
        ]
      }
      vrp_solution: {
        Row: {
          amount: number[] | null
          cost: number | null
          delivery: number[] | null
          duration: number | null
          id: string
          loading_time: number | null
          optimization_id: string
          pickup: number[] | null
          priority: number | null
          routes_count: number | null
          routing_time: number | null
          service: number | null
          setup: number | null
          solving_time: number | null
          unassigned_count: number | null
          waiting_time: number | null
        }
        Insert: {
          amount?: number[] | null
          cost?: number | null
          delivery?: number[] | null
          duration?: number | null
          id?: string
          loading_time?: number | null
          optimization_id: string
          pickup?: number[] | null
          priority?: number | null
          routes_count?: number | null
          routing_time?: number | null
          service?: number | null
          setup?: number | null
          solving_time?: number | null
          unassigned_count?: number | null
          waiting_time?: number | null
        }
        Update: {
          amount?: number[] | null
          cost?: number | null
          delivery?: number[] | null
          duration?: number | null
          id?: string
          loading_time?: number | null
          optimization_id?: string
          pickup?: number[] | null
          priority?: number | null
          routes_count?: number | null
          routing_time?: number | null
          service?: number | null
          setup?: number | null
          solving_time?: number | null
          unassigned_count?: number | null
          waiting_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vrp_solution_optimization_id_fkey"
            columns: ["optimization_id"]
            isOneToOne: false
            referencedRelation: "vrp_optimization"
            referencedColumns: ["id"]
          },
        ]
      }
      vrp_unassigned_job: {
        Row: {
          id: number
          job_id: number | null
          location: unknown
          solution_id: string
          type: string | null
        }
        Insert: {
          id?: number
          job_id?: number | null
          location?: unknown
          solution_id: string
          type?: string | null
        }
        Update: {
          id?: number
          job_id?: number | null
          location?: unknown
          solution_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vrp_unassigned_job_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "vrp_solution"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse: {
        Row: {
          id: string
          warehouse_address: string
          warehouse_city: string
          warehouse_country: string
          warehouse_location: unknown
          warehouse_name: string
          warehouse_state: string
          warehouse_zipcode: string
        }
        Insert: {
          id?: string
          warehouse_address: string
          warehouse_city: string
          warehouse_country: string
          warehouse_location: unknown
          warehouse_name: string
          warehouse_state: string
          warehouse_zipcode: string
        }
        Update: {
          id?: string
          warehouse_address?: string
          warehouse_city?: string
          warehouse_country?: string
          warehouse_location?: unknown
          warehouse_name?: string
          warehouse_state?: string
          warehouse_zipcode?: string
        }
        Relationships: []
      }
    }
    Views: {
      packages_with_latest_status: {
        Row: {
          created_at: string | null
          current_status: string | null
          delivery_notes: string | null
          from_customer: string | null
          id: string | null
          to_customer: string | null
          warehouse_address: string | null
          warehouse_id: string | null
          warehouse_lat: number | null
          warehouse_lng: number | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_from_customer_fkey"
            columns: ["from_customer"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_to_customer_fkey"
            columns: ["to_customer"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_driver: {
        Args: {
          p_display_name: string
          p_driver_license?: string
          p_email: string
          p_license_expiry?: string
          p_phone: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          driver_license: string
          email: string
          id: string
          license_expiry: string
          phone_number: string
        }[]
      }
      generate_tracking_number: { Args: never; Returns: string }
      get_driver_location_history: {
        Args: { from_ts: string; p_driver_id: string; to_ts: string }
        Returns: {
          created_at: string
          driver_id: string
          id: string
          lat: number
          lng: number
        }[]
      }
      get_drivers_by_ids: {
        Args: { p_driver_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          driver_license: string
          email: string
          id: string
          license_expiry: string
          phone_number: string
        }[]
      }
      get_drivers_paginated: {
        Args: { p_limit: number; p_page: number }
        Returns: {
          avatar_url: string
          display_name: string
          driver_license: string
          email: string
          id: string
          license_expiry: string
          page_number: number
          page_size: number
          phone_number: string
          total: number
          total_pages: number
        }[]
      }
      get_optimisation_list: {
        Args: { p_limit?: number; p_page?: number }
        Returns: {
          avg_route_duration_hours: number
          avg_route_duration_seconds: number
          avg_stops_per_route: number
          cost: number
          created_at: string
          id: string
          max_route_duration_seconds: number
          packages_assigned: number
          routes: number
          status: string
          total_count: number
          total_duration_hours: number
          total_duration_seconds: number
          unassigned: number
        }[]
      }
      get_packages_count: { Args: { p_statuses: string[] }; Returns: number }
      get_packages_with_latest_status: {
        Args: { p_limit?: number; p_offset?: number; p_statuses?: string[] }
        Returns: {
          created_at: string
          driver_id: string
          driver_name: string
          from_customer: string
          from_customer_address: string
          id: string
          latest_package_status_at: string
          latest_package_status_text: string
          to_customer: string
          to_customer_address: string
          tracking_number: string
        }[]
      }
      get_service_area_extent: {
        Args: never
        Returns: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }[]
      }
      get_service_areas_in_bounds: {
        Args: {
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
        }
        Returns: {
          geometry: Json
          id: string
          name: string
        }[]
      }
      get_team_members_paginated: {
        Args: { p_limit: number; p_page: number }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          id: string
          page_number: number
          page_size: number
          phone_number: string
          role: string
          total: number
          total_pages: number
        }[]
      }
      has_permission: { Args: { p_permission: string }; Returns: boolean }
      insert_package_timeline: {
        Args: { p_package_id: string; p_status_enum: string }
        Returns: undefined
      }
      list_drivers_by_warehouse: {
        Args: { p_limit: number; p_page: number; p_warehouse_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          driver_license: string
          email: string
          id: string
          license_expiry: string
          page_number: number
          page_size: number
          phone_number: string
          total: number
          total_pages: number
          vehicle_id: string
          vehicle_make: string
          vehicle_model: string
          vehicle_plate: string
          warehouse_id: string
        }[]
      }
      list_unassigned_drivers: {
        Args: { p_limit: number; p_page: number }
        Returns: {
          avatar_url: string
          display_name: string
          driver_license: string
          email: string
          id: string
          license_expiry: string
          page_number: number
          page_size: number
          phone_number: string
          total: number
          total_pages: number
        }[]
      }
      update_driver_profile: {
        Args: {
          p_avatar_url?: string
          p_display_name?: string
          p_driver_id: string
          p_driver_license?: string
          p_email?: string
          p_license_expiry?: string
          p_phone?: string
          p_vehicle_type?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
