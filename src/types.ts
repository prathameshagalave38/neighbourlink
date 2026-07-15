/**
 * NeighbourLink Type Definitions - Single Source of Truth
 */

export type UserRole = "SuperAdmin" | "Admin" | "Resident" | "Security";

export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export type ResidentType = "Owner" | "Tenant" | "FamilyMember" | "Child" | "SeniorCitizen";

export interface Resident {
  _id: string;
  flatId: string;
  buildingId: string;
  societyId: string;
  residentType: ResidentType;
  relationshipToOwner: string; // "Self", "Spouse", "Son", "Daughter", "Father", "Mother", etc.
  firstName: string;
  lastName: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  mobile: string;
  email: string;
  profilePhoto?: string;
  bloodGroup?: string;
  occupation?: string;
  companyName?: string;
  emergencyContact: {
    name: string;
    mobile: string;
  };
  status: "Active" | "Inactive" | "Shifted" | "Deceased";
  createdAt: string;
  updatedAt: string;
}

export interface Society {
  _id: string;
  name: string;
  registrationNumber: string;
  societyCode: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  email: string;
  phone: string;
  emergencyContact: string;
  logo?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export type BuildingType = "Residential" | "Commercial" | "Mixed Use";

export interface Building {
  _id: string;
  societyId: string;
  buildingName: string;
  buildingCode: string;
  buildingType: BuildingType;
  floors: number;
  totalFlats: number;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export type FlatType = "1 RK" | "1 BHK" | "2 BHK" | "3 BHK" | "4 BHK" | "Penthouse" | "Commercial";
export type OccupancyStatus = "Vacant" | "Owner Occupied" | "Tenant Occupied" | "Under Maintenance";

export interface Flat {
  _id: string;
  buildingId: string;
  flatNumber: string;
  floor: number;
  flatType: FlatType;
  occupancyStatus: OccupancyStatus;
  ownerId: string | null; // Resident ID or User ID of owner
  tenantId: string | null; // Resident ID or User ID of tenant
  residentIds: string[];
  parkingIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ComplaintCategory = 
  | "Electrical"
  | "Plumbing"
  | "Cleaning"
  | "Security"
  | "Lift"
  | "Parking"
  | "Water Supply"
  | "Noise"
  | "Common Area"
  | "Other";

export type ComplaintPriority = "Low" | "Medium" | "High" | "Emergency";
export type ComplaintStatus = "Open" | "Assigned" | "In Progress" | "Resolved" | "Closed" | "Reopened";

export interface ComplaintTimelineEntry {
  status: ComplaintStatus;
  date: string;
  notes: string;
  updatedBy: string; // name or user ID
}

export interface Complaint {
  _id: string;
  complaintNumber: string; // CMP-YYYY-XXXXXX
  residentId: string;
  flatId: string;
  buildingId: string;
  societyId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo: string | null; // Admin ID
  attachments: string[];
  resolutionNotes?: string;
  timeline: ComplaintTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export type VisitorType = "Guest" | "Delivery" | "ServiceProvider" | "Domestic Staff" | "Other";
export type VisitorStatus = 
  | "Expected"
  | "Waiting Approval"
  | "Approved"
  | "Rejected"
  | "Checked In"
  | "Inside Society"
  | "Checked Out"
  | "Cancelled";

export interface Visitor {
  _id: string;
  visitorNumber: string; // VIS-YYYY-XXXXXX
  residentId: string;
  flatId: string;
  buildingId: string;
  societyId: string;
  visitorName: string;
  mobile: string;
  visitorType: VisitorType;
  purpose: string;
  status: VisitorStatus;
  expectedDate: string;
  expectedTime: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  approvedBy: string | null; // Resident ID
  createdAt: string;
  updatedAt: string;
}

export type ParkingSlotType = "Resident" | "Visitor" | "Reserved" | "Disabled";
export type ParkingSlotStatus = "Available" | "Occupied" | "Reserved" | "Under Maintenance";

export interface ParkingSlot {
  _id: string;
  slotNumber: string;
  parkingType: ParkingSlotType;
  floor: string;
  parkingArea: string;
  status: ParkingSlotStatus;
  assignedResidentId: string | null;
  assignedVehicleId: string | null;
  coveredParking: boolean;
  evCharging: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VehicleType = "Bicycle" | "Scooter" | "Motorcycle" | "Car" | "SUV" | "Electric Vehicle";

export interface Vehicle {
  _id: string;
  residentId: string;
  flatId: string;
  buildingId: string;
  societyId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  brand: string;
  model: string;
  color: string;
  parkingSlotId: string | null;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceCharge {
  name: string;
  amount: number;
}

export interface MaintenancePlan {
  _id: string;
  societyId: string;
  planName: string;
  billingCycle: "Monthly" | "Quarterly" | "Yearly";
  charges: MaintenanceCharge[];
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export type BillStatus = "Draft" | "Generated" | "Pending" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";

export interface MaintenanceBill {
  _id: string;
  billNumber: string; // BILL-YYYY-MM-XXXXXX
  residentId: string;
  flatId: string;
  societyId: string;
  billingMonth: string; // e.g. "July 2026"
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Cheque";
export type PaymentStatus = "Pending" | "Completed" | "Failed" | "Cancelled";

export interface Payment {
  _id: string;
  paymentId: string; // PAY-YYYY-XXXXXX
  billId: string;
  residentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  receivedBy: string | null; // Admin ID
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  _id: string;
  receiptNumber: string; // RCT-YYYY-XXXXXX
  paymentId: string;
  billId: string;
  residentId: string;
  amount: number;
  generatedAt: string;
}

export type NoticeType = "General" | "Emergency" | "Event" | "Maintenance" | "Financial";
export type NoticeStatus = "Draft" | "Published" | "Archived";

export interface Notice {
  _id: string;
  title: string;
  description: string;
  type: NoticeType;
  status: NoticeStatus;
  createdBy: string; // Admin ID or Name
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = "Visitor" | "Maintenance" | "Complaint" | "Notice" | "Parking";
export type NotificationPriority = "Low" | "Medium" | "High" | "Emergency";

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  relatedModule: string;
  relatedId: string;
  status: "Unread" | "Read";
  createdAt: string;
  readAt: string | null;
}

export interface AuditLog {
  _id: string;
  entityType: string; // "Resident" | "Complaint" | "Payment" | etc.
  entityId: string;
  action: string; // "Created" | "Updated" | "Deactivated" | etc.
  performedBy: string; // User ID or Name
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}
