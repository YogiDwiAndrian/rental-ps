-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'owner', 'staff');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('available', 'occupied', 'maintenance', 'broken');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('timer', 'hourly', 'package', 'hybrid');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'completed', 'cancelled', 'power_outage_stopped');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('rental', 'fnb', 'extension', 'refund');

-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('owner', 'manager', 'staff', 'custom');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'SESSION_EXPIRED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED', 'USER_LOCATION_ASSIGNED', 'USER_LOCATION_UNASSIGNED', 'TENANT_CREATED', 'TENANT_UPDATED', 'TENANT_ACTIVATED', 'TENANT_DEACTIVATED', 'TENANT_DOMAIN_CHANGED', 'LOCATION_CREATED', 'LOCATION_UPDATED', 'LOCATION_DELETED', 'LOCATION_ACTIVATED', 'LOCATION_DEACTIVATED', 'UNIT_CREATED', 'UNIT_UPDATED', 'UNIT_DELETED', 'UNIT_STATUS_CHANGED', 'UNIT_PRICING_UPDATED', 'SESSION_STARTED', 'SESSION_EXTENDED', 'SESSION_COMPLETED', 'SESSION_CANCELLED', 'SESSION_POWER_OUTAGE', 'FNB_ITEM_CREATED', 'FNB_ITEM_UPDATED', 'FNB_ITEM_DELETED', 'FNB_ORDER_CREATED', 'FNB_ORDER_CANCELLED', 'FNB_STOCK_UPDATED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'REFUND_ISSUED', 'SYSTEM_BACKUP', 'SYSTEM_MAINTENANCE', 'DATA_EXPORT', 'DATA_IMPORT', 'RATE_LIMIT_TRIGGERED', 'SECURITY_VIOLATION', 'CUSTOMER_PAGE_VIEWED', 'CUSTOMER_PAGE_CONFIG_UPDATED', 'API_ACCESS', 'API_RATE_LIMITED', 'API_ERROR');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "custom_domain" TEXT,
    "domain_verified" BOOLEAN NOT NULL DEFAULT false,
    "customer_page_enabled" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'staff',
    "tenant_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "public_description" TEXT,
    "operational_hours" JSONB,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "show_on_customer_page" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "console_type" TEXT NOT NULL,
    "controller_count" INTEGER NOT NULL DEFAULT 2,
    "status" "UnitStatus" NOT NULL DEFAULT 'available',
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "customer_display_name" TEXT,
    "specifications" JSONB,
    "package_rates" JSONB,
    "show_on_customer_page" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_sessions" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "billing_model" "BillingType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "purchased_duration" INTEGER NOT NULL DEFAULT 0,
    "extended_duration" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_categories" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_items" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selling_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "min_stock_alert" INTEGER NOT NULL DEFAULT 5,
    "unit_type" TEXT NOT NULL DEFAULT 'pcs',
    "customer_display_name" TEXT,
    "customer_description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "show_on_customer_page" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_orders" (
    "id" TEXT NOT NULL,
    "rental_session_id" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_order_items" (
    "id" TEXT NOT NULL,
    "fnb_order_id" TEXT NOT NULL,
    "fnb_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fnb_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "rental_session_id" TEXT,
    "fnb_order_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "whatsapp_number" TEXT NOT NULL,
    "role" "ContactRole" NOT NULL DEFAULT 'staff',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "response_time" TEXT,
    "availability_schedule" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_page_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "show_unit_status" BOOLEAN NOT NULL DEFAULT true,
    "show_remaining_time" BOOLEAN NOT NULL DEFAULT true,
    "show_pricing" BOOLEAN NOT NULL DEFAULT true,
    "show_fnb_menu" BOOLEAN NOT NULL DEFAULT true,
    "show_contact_info" BOOLEAN NOT NULL DEFAULT true,
    "show_maps" BOOLEAN NOT NULL DEFAULT false,
    "show_operational_hours" BOOLEAN NOT NULL DEFAULT true,
    "unit_status_refresh_seconds" INTEGER NOT NULL DEFAULT 30,
    "fnb_menu_refresh_seconds" INTEGER NOT NULL DEFAULT 300,
    "primary_color" TEXT NOT NULL DEFAULT '#3B82F6',
    "public_phone" TEXT,
    "public_email" TEXT,
    "public_address" TEXT,
    "whatsapp_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_page_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "company_name" TEXT NOT NULL DEFAULT 'RentalPS Platform',
    "company_description" TEXT NOT NULL DEFAULT 'Platform SaaS untuk Rental PlayStation',
    "starter_price" INTEGER NOT NULL DEFAULT 150000,
    "starter_features" TEXT[],
    "premium_price" INTEGER NOT NULL DEFAULT 250000,
    "premium_features" TEXT[],
    "enterprise_price" INTEGER NOT NULL DEFAULT 500000,
    "enterprise_features" TEXT[],
    "contact_phone" TEXT NOT NULL DEFAULT '+62 812-1234-5678',
    "contact_email" TEXT NOT NULL DEFAULT 'hello@rentalps.com',
    "contact_whatsapp" TEXT NOT NULL DEFAULT '+6281212345678',
    "features_list" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "event_type" "AuditEventType" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'LOW',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "user_id" TEXT,
    "email" TEXT,
    "user_role" "UserRole",
    "tenant_id" TEXT,
    "location_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "subdomain" TEXT,
    "request_path" TEXT,
    "request_method" TEXT,
    "rate_limit_info" JSONB,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "response_time" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_code_key" ON "locations"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "location_assignments_user_id_location_id_key" ON "location_assignments"("user_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_location_id_name_key" ON "units"("location_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fnb_categories_location_id_name_key" ON "fnb_categories"("location_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fnb_items_location_id_category_id_name_key" ON "fnb_items"("location_id", "category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_page_configs_tenant_id_location_id_key" ON "customer_page_configs"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_location_id_idx" ON "audit_logs"("location_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs"("ip_address");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_success_idx" ON "audit_logs"("success");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_timestamp_idx" ON "audit_logs"("event_type", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs"("tenant_id", "timestamp");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_assignments" ADD CONSTRAINT "location_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_assignments" ADD CONSTRAINT "location_assignments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_categories" ADD CONSTRAINT "fnb_categories_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_items" ADD CONSTRAINT "fnb_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_items" ADD CONSTRAINT "fnb_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fnb_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_rental_session_id_fkey" FOREIGN KEY ("rental_session_id") REFERENCES "rental_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_order_items" ADD CONSTRAINT "fnb_order_items_fnb_order_id_fkey" FOREIGN KEY ("fnb_order_id") REFERENCES "fnb_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_order_items" ADD CONSTRAINT "fnb_order_items_fnb_item_id_fkey" FOREIGN KEY ("fnb_item_id") REFERENCES "fnb_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_rental_session_id_fkey" FOREIGN KEY ("rental_session_id") REFERENCES "rental_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fnb_order_id_fkey" FOREIGN KEY ("fnb_order_id") REFERENCES "fnb_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_page_configs" ADD CONSTRAINT "customer_page_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_page_configs" ADD CONSTRAINT "customer_page_configs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
