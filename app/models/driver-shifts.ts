export interface DriverShifts {
    data: Data[]
    total: number
}

export interface Data {
    id: string
    vrp_route_step: VrpRouteStep[]
    vrp_solution: VrpSolution
}

export interface VrpRouteStep {
    route_id: string
    type: string
    solution_id: string
    duration: number | null
}

export interface VrpSolution {
    id: string
    optimization_id: string
    vrp_optimization: VrpOptimization
}

export interface VrpOptimization {
    id: string
    created_at: string
}