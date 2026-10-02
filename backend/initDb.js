import pool from "./db.js";

export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL is not set. Skipping initDatabase.");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        balance NUMERIC NOT NULL DEFAULT 50000,
        phone VARCHAR(20) DEFAULT '',
        mpin VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'success',
        receiver_email VARCHAR(255),
        category VARCHAR(100) DEFAULT 'General',
        stripe_session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        monthly_budget NUMERIC NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vaults (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        target_amount NUMERIC NOT NULL DEFAULT 10000,
        current_amount NUMERIC NOT NULL DEFAULT 0,
        icon VARCHAR(10) DEFAULT '🎯',
        color VARCHAR(40) DEFAULT 'from-blue-500 to-indigo-600',
        is_roundup_target BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_number VARCHAR(19) NOT NULL,
        holder_name VARCHAR(100) NOT NULL,
        expiry VARCHAR(5) NOT NULL,
        cvv VARCHAR(4) NOT NULL,
        card_tier VARCHAR(30) DEFAULT 'Platinum Neo',
        is_frozen BOOLEAN DEFAULT false,
        online_enabled BOOLEAN DEFAULT true,
        daily_limit NUMERIC DEFAULT 25000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS beneficiaries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        beneficiary_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        nickname VARCHAR(100),
        phone VARCHAR(20) DEFAULT '',
        account_type VARCHAR(50) DEFAULT 'individual',
        avatar_color VARCHAR(60) DEFAULT 'from-blue-500 to-cyan-500',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, email)
      );

      CREATE TABLE IF NOT EXISTS recurring_payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        category VARCHAR(50) DEFAULT 'Subscription',
        amount NUMERIC NOT NULL,
        frequency VARCHAR(30) DEFAULT 'monthly',
        receiver_name VARCHAR(100) DEFAULT '',
        receiver_account VARCHAR(255) DEFAULT '',
        start_date DATE DEFAULT CURRENT_DATE,
        next_execution DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        icon VARCHAR(10) DEFAULT '⚡',
        color VARCHAR(60) DEFAULT 'from-indigo-500 to-purple-600',
        auto_debit BOOLEAN DEFAULT true,
        last_processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS split_bills (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        total_amount NUMERIC NOT NULL,
        category VARCHAR(50) DEFAULT 'Dining',
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS split_bill_participants (
        id SERIAL PRIMARY KEY,
        split_bill_id INTEGER NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        share_amount NUMERIC NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        settled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fixed_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deposit_number VARCHAR(50) UNIQUE NOT NULL,
        principal_amount NUMERIC NOT NULL,
        interest_rate NUMERIC NOT NULL,
        tenure_months INTEGER NOT NULL,
        maturity_amount NUMERIC NOT NULL,
        interest_earned NUMERIC NOT NULL,
        payout_type VARCHAR(30) DEFAULT 'at_maturity',
        start_date DATE DEFAULT CURRENT_DATE,
        maturity_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        liquidation_date DATE,
        payout_amount NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS category_budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        allocated_limit NUMERIC NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        icon VARCHAR(10) DEFAULT '📊',
        color VARCHAR(40) DEFAULT 'from-blue-500 to-indigo-600',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category, month, year)
      );

      CREATE TABLE IF NOT EXISTS currency_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        currency VARCHAR(10) NOT NULL,
        balance NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, currency)
      );

      CREATE TABLE IF NOT EXISTS forex_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_currency VARCHAR(10) NOT NULL,
        to_currency VARCHAR(10) NOT NULL,
        from_amount NUMERIC NOT NULL,
        to_amount NUMERIC NOT NULL,
        exchange_rate NUMERIC NOT NULL,
        fee NUMERIC NOT NULL DEFAULT 0,
        type VARCHAR(30) DEFAULT 'exchange',
        reference_id VARCHAR(50) NOT NULL,
        recipient_info TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kyc_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pan_number VARCHAR(10) NOT NULL,
        aadhaar_number VARCHAR(14) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        dob DATE,
        gender VARCHAR(20) DEFAULT 'Not Specified',
        occupation VARCHAR(50) DEFAULT 'Salaried Professional',
        annual_income VARCHAR(50) DEFAULT '₹5 Lakh - ₹10 Lakh',
        address TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'verified',
        verification_ref VARCHAR(50) NOT NULL,
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        loan_account_no VARCHAR(50) UNIQUE NOT NULL,
        principal_amount NUMERIC NOT NULL,
        tenure_months INTEGER NOT NULL,
        interest_rate NUMERIC NOT NULL,
        emi_amount NUMERIC NOT NULL,
        total_payable NUMERIC NOT NULL,
        remaining_amount NUMERIC NOT NULL,
        emis_paid INTEGER DEFAULT 0,
        total_emis INTEGER NOT NULL,
        purpose VARCHAR(100) DEFAULT 'Personal Expense',
        status VARCHAR(20) DEFAULT 'active',
        next_emi_date DATE NOT NULL,
        disbursed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loan_repayments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emi_number INTEGER NOT NULL,
        amount NUMERIC NOT NULL,
        principal_component NUMERIC NOT NULL,
        interest_component NUMERIC NOT NULL,
        payment_type VARCHAR(30) DEFAULT 'emi',
        transaction_ref VARCHAR(50) NOT NULL,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scratch_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        reward_type VARCHAR(30) NOT NULL,
        reward_value NUMERIC NOT NULL,
        coupon_code VARCHAR(50),
        merchant_name VARCHAR(100),
        source_event VARCHAR(100) DEFAULT 'Banking Activity',
        is_scratched BOOLEAN DEFAULT FALSE,
        is_claimed BOOLEAN DEFAULT FALSE,
        scratched_at TIMESTAMP,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coin_redemptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        coins_spent INTEGER NOT NULL,
        reward_type VARCHAR(30) NOT NULL,
        cash_amount NUMERIC DEFAULT 0,
        voucher_title VARCHAR(150),
        voucher_code VARCHAR(50),
        merchant_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gold_holdings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        grams_held NUMERIC NOT NULL DEFAULT 0,
        total_invested NUMERIC NOT NULL DEFAULT 0,
        average_buy_price NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gold_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trade_type VARCHAR(20) NOT NULL,
        grams NUMERIC NOT NULL,
        rate_per_gram NUMERIC NOT NULL,
        gross_amount NUMERIC NOT NULL,
        gst_amount NUMERIC NOT NULL DEFAULT 0,
        net_amount NUMERIC NOT NULL,
        invoice_ref VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gold_sips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sip_amount NUMERIC NOT NULL,
        frequency VARCHAR(20) DEFAULT 'monthly',
        status VARCHAR(20) DEFAULT 'active',
        total_runs INTEGER DEFAULT 0,
        total_accumulated_grams NUMERIC DEFAULT 0,
        next_execution DATE NOT NULL,
        last_executed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payment_links (
        id SERIAL PRIMARY KEY,
        link_code VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        description TEXT NOT NULL,
        customer_name VARCHAR(100) DEFAULT '',
        customer_phone VARCHAR(20) DEFAULT '',
        customer_email VARCHAR(255) DEFAULT '',
        status VARCHAR(20) DEFAULT 'active',
        upi_string TEXT NOT NULL,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
        paid_at TIMESTAMP,
        paid_by_name VARCHAR(100),
        paid_by_method VARCHAR(50),
        transaction_ref VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tax_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        financial_year VARCHAR(20) DEFAULT '2025-26',
        preferred_regime VARCHAR(10) DEFAULT 'new',
        declared_80c NUMERIC DEFAULT 150000,
        declared_80d NUMERIC DEFAULT 25000,
        declared_hra NUMERIC DEFAULT 0,
        declared_nps NUMERIC DEFAULT 50000,
        home_loan_interest NUMERIC DEFAULT 0,
        advance_tax_paid NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tax_challans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challan_no VARCHAR(50) UNIQUE NOT NULL,
        financial_year VARCHAR(20) NOT NULL,
        assessment_year VARCHAR(20) NOT NULL,
        tax_type VARCHAR(50) DEFAULT 'Advance Tax (100)',
        amount NUMERIC NOT NULL,
        bsr_code VARCHAR(10) DEFAULT '0210041',
        cin VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_biometrics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        device_name VARCHAR(100) DEFAULT 'Biometric Device',
        counter INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS external_credit_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bank_name VARCHAR(50) NOT NULL,
        card_network VARCHAR(30) DEFAULT 'Visa',
        card_variant VARCHAR(100) DEFAULT 'Regalia',
        card_last4 VARCHAR(4) NOT NULL,
        holder_name VARCHAR(100) NOT NULL,
        credit_limit NUMERIC NOT NULL DEFAULT 200000,
        current_outstanding NUMERIC NOT NULL DEFAULT 24500,
        min_due NUMERIC NOT NULL DEFAULT 2500,
        due_date DATE NOT NULL,
        billing_cycle_date INTEGER DEFAULT 15,
        card_theme VARCHAR(50) DEFAULT 'sapphire',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credit_card_payments (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES external_credit_cards(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Neo Wallet Balance',
        cashback_earned NUMERIC DEFAULT 0,
        transaction_ref VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_kyc_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_score INTEGER DEFAULT 782;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 450;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_tier VARCHAR(30) DEFAULT 'Gold';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_checkin DATE;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_email VARCHAR(255);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Alert';
      ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL;
      ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS atm_enabled BOOLEAN DEFAULT true;
      ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS contactless_enabled BOOLEAN DEFAULT true;
      ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS international_enabled BOOLEAN DEFAULT false;
      ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS atm_limit NUMERIC DEFAULT 10000;
      ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS card_pin VARCHAR(255) DEFAULT '1234';
    `);

    console.log("✅ Database schema initialized successfully (users, transactions, budgets, category_budgets, notifications, vaults, user_cards, beneficiaries, recurring_payments, split_bills, fixed_deposits, currency_wallets, forex_transactions, kyc_records, loans, loan_repayments, scratch_cards, coin_redemptions, gold_holdings, gold_transactions, gold_sips, payment_links, tax_profiles, tax_challans, user_biometrics, external_credit_cards, credit_card_payments verified).");
  } catch (err) {
    console.error("⚠️ Database initialization note:", err.message);
  }
}
