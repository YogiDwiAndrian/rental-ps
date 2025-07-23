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
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "manager_id" TEXT,
    "public_description" TEXT,
    "operational_hours" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "show_on_customer_page" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_location_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_location_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "console_type" TEXT NOT NULL,
    "controller_count" INTEGER NOT NULL DEFAULT 1,
    "status" "UnitStatus" NOT NULL DEFAULT 'available',
    "hourly_rate" DECIMAL(8,2) NOT NULL,
    "package_rates" JSONB NOT NULL DEFAULT '{}',
    "specifications" JSONB NOT NULL DEFAULT '{}',
    "show_on_customer_page" BOOLEAN NOT NULL DEFAULT true,
    "customer_display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "billing_model" "BillingType" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "purchased_duration" INTEGER,
    "extended_duration" INTEGER NOT NULL DEFAULT 0,
    "session_identifier" TEXT,
    "total_amount" DECIMAL(10,2),
    "ps_amount" DECIMAL(10,2),
    "fnb_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "power_outage_event_id" TEXT,
    "emergency_stop_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_extensions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "extended_duration" INTEGER NOT NULL,
    "additional_amount" DECIMAL(10,2) NOT NULL,
    "original_billing_model" "BillingType",
    "extension_type" TEXT,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "extended_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_outage_events" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL,
    "affected_sessions" INTEGER NOT NULL,
    "total_revenue_secured" DECIMAL(10,2) NOT NULL,
    "recovery_time" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "power_outage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selling_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "min_stock_alert" INTEGER NOT NULL DEFAULT 5,
    "unit_type" TEXT NOT NULL DEFAULT 'pcs',
    "show_on_customer_page" BOOLEAN NOT NULL DEFAULT true,
    "customer_display_name" TEXT,
    "customer_description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "rental_session_id" TEXT,
    "fnb_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_timing" TEXT NOT NULL DEFAULT 'end_of_session',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "order_notes" TEXT,
    "served_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "session_id" TEXT,
    "staff_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "ps_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fnb_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "receipt_number" TEXT,
    "receipt_data" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_page_config" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "show_unit_status" BOOLEAN NOT NULL DEFAULT true,
    "show_remaining_time" BOOLEAN NOT NULL DEFAULT true,
    "show_pricing" BOOLEAN NOT NULL DEFAULT true,
    "show_fnb_menu" BOOLEAN NOT NULL DEFAULT true,
    "show_contact_info" BOOLEAN NOT NULL DEFAULT true,
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

    CONSTRAINT "customer_page_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_config" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL DEFAULT 'RentalPS Platform',
    "company_description" TEXT,
    "starter_price" INTEGER NOT NULL DEFAULT 150000,
    "starter_features" JSONB NOT NULL DEFAULT '[]',
    "premium_price" INTEGER NOT NULL DEFAULT 250000,
    "premium_features" JSONB NOT NULL DEFAULT '[]',
    "enterprise_price" INTEGER NOT NULL DEFAULT 500000,
    "enterprise_features" JSONB NOT NULL DEFAULT '[]',
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_whatsapp" TEXT,
    "features_list" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_code_key" ON "locations"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_name_key" ON "locations"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_location_assignments_user_id_location_id_key" ON "user_location_assignments"("user_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_location_id_name_key" ON "units"("location_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fnb_items_location_id_name_key" ON "fnb_items"("location_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_page_config_tenant_id_location_id_key" ON "customer_page_config"("tenant_id", "location_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_assignments" ADD CONSTRAINT "user_location_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_assignments" ADD CONSTRAINT "user_location_assignments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_power_outage_event_id_fkey" FOREIGN KEY ("power_outage_event_id") REFERENCES "power_outage_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_extensions" ADD CONSTRAINT "session_extensions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "rental_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_extensions" ADD CONSTRAINT "session_extensions_extended_by_fkey" FOREIGN KEY ("extended_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_outage_events" ADD CONSTRAINT "power_outage_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_outage_events" ADD CONSTRAINT "power_outage_events_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_categories" ADD CONSTRAINT "fnb_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_categories" ADD CONSTRAINT "fnb_categories_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_items" ADD CONSTRAINT "fnb_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_items" ADD CONSTRAINT "fnb_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_items" ADD CONSTRAINT "fnb_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fnb_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_rental_session_id_fkey" FOREIGN KEY ("rental_session_id") REFERENCES "rental_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_fnb_item_id_fkey" FOREIGN KEY ("fnb_item_id") REFERENCES "fnb_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "rental_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_page_config" ADD CONSTRAINT "customer_page_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_page_config" ADD CONSTRAINT "customer_page_config_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
