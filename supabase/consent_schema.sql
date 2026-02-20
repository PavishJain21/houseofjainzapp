-- User Consents and Compliance Schema
-- This schema stores user consents for IT compliance (GDPR, CCPA, etc.)

-- User Consents table - stores all user consents
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'terms', 'privacy', 'cookies', 'location', 'camera', 'storage', 'notifications'
    consent_version VARCHAR(20) NOT NULL, -- Version of the document (e.g., '1.0', '2.1')
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45), -- Store IP for compliance
    user_agent TEXT, -- Store user agent for compliance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, consent_type, consent_version)
);

-- Consent Documents table - stores versions of legal documents
CREATE TABLE IF NOT EXISTS consent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(50) NOT NULL, -- 'terms', 'privacy', 'cookie_policy'
    version VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Full text of the document
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_type, version)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_granted ON user_consents(granted);
CREATE INDEX IF NOT EXISTS idx_consent_documents_type ON consent_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_consent_documents_active ON consent_documents(is_active);

-- Function to update updated_at timestamp
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_documents_updated_at BEFORE UPDATE ON consent_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default consent documents (Terms & Conditions)
INSERT INTO consent_documents (document_type, version, title, content, effective_date, is_active)
VALUES (
    'terms',
    '1.0',
    'Terms and Conditions',
    'TERMS AND CONDITIONS FOR HOUSE OF JAINZ

Last Updated: ' || CURRENT_DATE || '

1. ACCEPTANCE OF TERMS
By accessing and using the House of Jainz mobile application ("App"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.

2. DESCRIPTION OF SERVICE
House of Jainz is a community-based e-commerce platform designed for the Jain community, allowing users to:
- Connect with nearby community members
- Create and share posts with images and location
- Buy and sell products through the marketplace
- Manage shops and products as a seller
- Place and manage orders

3. USER ACCOUNTS
- You must be at least 18 years old to use this App
- You are responsible for maintaining the confidentiality of your account
- You agree to provide accurate and complete information during registration
- You are responsible for all activities that occur under your account

4. USER CONDUCT
You agree not to:
- Post offensive, defamatory, or illegal content
- Violate any applicable laws or regulations
- Infringe on intellectual property rights
- Spam or harass other users
- Use the App for any fraudulent or illegal purposes

5. MARKETPLACE AND TRANSACTIONS
- Sellers are responsible for the accuracy of product descriptions
- Buyers are responsible for reviewing product details before purchase
- All transactions are between buyers and sellers directly
- House of Jainz is not responsible for disputes between buyers and sellers
- Payment processing is handled by third-party payment gateways

6. SUBSCRIPTION AND FEES
- Shop owners receive a 30-day free trial
- After the trial, a monthly subscription fee of ₹199 applies
- Subscriptions are billed monthly and auto-renew unless cancelled
- Refunds are subject to our refund policy

7. INTELLECTUAL PROPERTY
- All content in the App is protected by copyright
- You retain ownership of content you post
- By posting content, you grant House of Jainz a license to use, display, and distribute your content

8. PRIVACY
Your use of the App is also governed by our Privacy Policy. Please review it to understand how we collect and use your information.

9. LIMITATION OF LIABILITY
House of Jainz shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.

10. TERMINATION
We reserve the right to terminate or suspend your account at any time for violation of these terms.

11. CHANGES TO TERMS
We may update these Terms and Conditions from time to time. Continued use of the App constitutes acceptance of updated terms.

12. CONTACT INFORMATION
For questions about these Terms, please contact us through the App support features.

By using House of Jainz, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.',
    NOW(),
    true
) ON CONFLICT (document_type, version) DO NOTHING;

-- Insert default Privacy Policy document
INSERT INTO consent_documents (document_type, version, title, content, effective_date, is_active)
VALUES (
    'privacy',
    '1.0',
    'Privacy Policy',
    'PRIVACY POLICY FOR HOUSE OF JAINZ

Last Updated: ' || CURRENT_DATE || '

1. INTRODUCTION
House of Jainz ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.

2. INFORMATION WE COLLECT

2.1 Personal Information
- Name, email address, phone number
- Religion (for community matching)
- Location data (when you grant permission)
- Profile information and preferences

2.2 Usage Information
- Posts, comments, likes, and interactions
- Shop and product listings
- Order history and transaction data
- Search queries and browsing behavior

2.3 Device Information
- Device type, operating system, unique device identifiers
- IP address, browser type
- Mobile network information

2.4 Location Information
- We collect location data when you:
  - Create posts with location
  - Create shops
  - Search for nearby shops/products
- Location data is used only for the features you enable

2.5 Media Information
- Photos you upload for posts and products
- Camera and media library access (with your permission)

3. HOW WE USE YOUR INFORMATION
- To provide and maintain our services
- To process transactions and orders
- To send notifications about orders and activities
- To personalize your experience
- To improve our services
- To communicate with you about your account
- To comply with legal obligations

4. DATA STORAGE AND SECURITY
- Your data is stored securely using Supabase (PostgreSQL database)
- Images are stored in Supabase Storage
- We use encryption and security measures to protect your data
- However, no method of transmission over the internet is 100% secure

5. DATA SHARING AND DISCLOSURE
We do not sell your personal information. We may share your information:
- With other users (as part of the community features)
- With service providers who assist in operating the App
- When required by law or to protect our rights
- In case of business transfer or merger

6. YOUR RIGHTS
You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Withdraw consent at any time
- Export your data
- Object to processing of your data

7. COOKIES AND TRACKING
- We use cookies and similar technologies for:
  - Authentication and session management
  - Analytics and performance monitoring
  - Personalization
- You can control cookie preferences through your device settings

8. LOCATION DATA
- Location data is collected only with your explicit consent
- You can revoke location permissions at any time through device settings
- Location data is used only for the features you enable

9. CHILDREN''S PRIVACY
Our App is not intended for users under 18 years of age. We do not knowingly collect information from children.

10. DATA RETENTION
We retain your data for as long as your account is active or as needed to provide services. You can request deletion of your account and data at any time.

11. INTERNATIONAL DATA TRANSFERS
Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place.

12. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of significant changes.

13. CONTACT US
For privacy-related questions or to exercise your rights, please contact us through the App support features.

By using House of Jainz, you acknowledge that you have read and understood this Privacy Policy.',
    NOW(),
    true
) ON CONFLICT (document_type, version) DO NOTHING;

-- Insert default Cookie Policy document
INSERT INTO consent_documents (document_type, version, title, content, effective_date, is_active)
VALUES (
    'cookie_policy',
    '1.0',
    'Cookie Policy',
    'COOKIE POLICY FOR HOUSE OF JAINZ

Last Updated: ' || CURRENT_DATE || '

1. WHAT ARE COOKIES
Cookies are small text files stored on your device when you visit our App. They help us provide you with a better experience.

2. TYPES OF COOKIES WE USE

2.1 Essential Cookies
These cookies are necessary for the App to function:
- Authentication cookies (to keep you logged in)
- Session cookies (to maintain your session)
- Security cookies (to protect against fraud)

2.2 Functional Cookies
These cookies enhance functionality:
- Language preferences
- Location settings
- User preferences

2.3 Analytics Cookies
These cookies help us understand how users interact with the App:
- Page views and navigation patterns
- Feature usage statistics
- Performance metrics

3. THIRD-PARTY COOKIES
We may use third-party services that set cookies:
- Analytics providers (to understand usage)
- Payment processors (for secure transactions)
- Cloud storage providers (for data storage)

4. MANAGING COOKIES
You can control cookies through:
- Your device settings
- Your browser settings (for web version)
- Our App settings

5. COOKIE CONSENT
By using our App, you consent to our use of cookies as described in this policy. You can withdraw consent at any time.

6. UPDATES TO THIS POLICY
We may update this Cookie Policy from time to time. Please review it periodically.

For questions about our Cookie Policy, please contact us through the App support features.',
    NOW(),
    true
) ON CONFLICT (document_type, version) DO NOTHING;

