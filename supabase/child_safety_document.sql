-- Child Safety document for public URL /childsafety and in-app Child Safety screen.
-- Run this in Supabase SQL Editor to add or update the child safety policy.
-- document_type must be 'child_safety' to match the API: GET /consent/document/child_safety

INSERT INTO consent_documents (document_type, version, title, content, effective_date, is_active)
VALUES (
  'child_safety',
  '1.0',
  'Child Safety',
  'CHILD SAFETY – HOUSE OF JAINZ

House of Jainz is committed to providing a safe experience for users of all ages, including children and families.

1. Age and parental consent
We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you are under 13, please do not register or provide personal information. If we learn that we have collected personal information from a child under 13 without parental consent, we will take steps to delete that information. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can address it.

2. Family-friendly content and conduct
We expect all users to behave in a way that is appropriate for a community that may include minors. Content that is harmful, exploitative, or inappropriate for children is not permitted. We may remove content and take action against accounts that violate our community standards.

3. Reporting and safety tools
If you see content or behaviour that you believe is unsafe for children or violates our policies, please report it through the app or contact us. We will review reports and take appropriate action, which may include removing content, warning users, or suspending accounts.

4. Privacy and data
Our Privacy Policy describes how we collect, use, and protect personal information. For users under 13, we limit data collection and use in line with applicable laws (such as COPPA where applicable) and we do not use personal information for behavioural advertising without appropriate consent.

5. Contact
For questions about child safety or to report a concern, please contact us using the contact details provided in the app or on our website.',
  NOW(),
  true
)
ON CONFLICT (document_type, version) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  effective_date = EXCLUDED.effective_date,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
