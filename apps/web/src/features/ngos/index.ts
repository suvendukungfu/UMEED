/**
 * NGO Intelligence Registry Module (Phase 4 Foundation)
 */
export interface NGORegistryEntry {
  ngo_id: string;
  name: string;
  darpan_id?: string;
  verification_status: "publicly_listed" | "registration_checked" | "operationally_verified";
  service_categories: string[];
  operational_districts: string[];
  capacity_status: "available" | "limited" | "full";
}

