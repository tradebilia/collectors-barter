import React from "react";
import { Mail, Shield, Trash2, Lock } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-lg text-slate-600">
            Last updated: <span className="font-semibold">July 21, 2026</span>
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-slate-700 leading-relaxed mb-6">
            Tradebilia ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services, including our OAuth integrations with third-party platforms.
          </p>

          {/* Section 1 */}
          <div className="mb-10">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-4">Direct Registration</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• Full name, email address, phone number</li>
                <li>• Username and password (hashed and encrypted)</li>
                <li>• Mailing address and location information</li>
                <li>• Security question and answer (hashed with bcrypt)</li>
                <li>• Profile information (bio, avatar, collecting interests)</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-4">Third-Party OAuth Integrations</h3>
              <p className="text-slate-700 mb-4">
                When you choose to connect your Tradebilia account with third-party services, we collect and store the following information:
              </p>
              <ul className="space-y-3 text-slate-700">
                <li>
                  <strong>eBay:</strong> Username, user ID, feedback score, feedback percentage, member since date, seller level, ID verification status, feedback ratings (positive/neutral/negative), store owner status
                </li>
                <li>
                  <strong>Facebook:</strong> Name, email address, profile picture URL, location, profile link, verified status, liked pages/interests
                </li>
                <li>
                  <strong>LinkedIn:</strong> Full name, email address, profile picture URL, headline/job title, location, profile URL, email verification status
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Automatically Collected Information</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• IP address and device information</li>
                <li>• Browser type and operating system</li>
                <li>• Pages visited and time spent on site</li>
                <li>• Referral source</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className="mb-10">
            <div className="flex items-start gap-3 mb-4">
              <Lock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
              </div>
            </div>

            <ul className="space-y-3 text-slate-700 ml-4">
              <li>
                <strong>Identity Verification:</strong> To verify your identity and display trust badges on your public profile
              </li>
              <li>
                <strong>Account Management:</strong> To create, maintain, and manage your Tradebilia account
              </li>
              <li>
                <strong>Marketplace Operations:</strong> To facilitate trades, display your profile to other collectors, and manage transactions
              </li>
              <li>
                <strong>Communication:</strong> To send you account notifications, security alerts, and service updates
              </li>
              <li>
                <strong>Fraud Prevention:</strong> To detect and prevent fraudulent activity and protect the security of our platform
              </li>
              <li>
                <strong>Service Improvement:</strong> To analyze usage patterns and improve our services
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Security</h2>
            <p className="text-slate-700 mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="space-y-2 text-slate-700 ml-4">
              <li>• Passwords are hashed using bcrypt with salt rounds</li>
              <li>• Security question answers are hashed before storage</li>
              <li>• OAuth access tokens are encrypted and stored securely</li>
              <li>• All data transmission uses HTTPS encryption</li>
              <li>• Database connections use SSL/TLS encryption</li>
              <li>• Regular security audits and updates</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="mb-10">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">4. User Data Deletion</h2>
              </div>
            </div>

            <p className="text-slate-700 mb-4">
              You have the right to request deletion of your personal data at any time. To delete your account and associated data:
            </p>
            <ol className="space-y-3 text-slate-700 ml-4 list-decimal">
              <li>Log in to your Tradebilia account</li>
              <li>Go to Account Settings → Security → Danger Zone</li>
              <li>Click "Delete Account"</li>
              <li>Confirm your request</li>
            </ol>
            <p className="text-slate-700 mt-4 bg-yellow-50 border border-yellow-200 rounded p-4">
              <strong>Note:</strong> Account deletion is permanent. All your profile information, trade history, and connected OAuth accounts will be removed from our systems within 30 days. Some data may be retained for legal or compliance purposes.
            </p>
          </div>

          {/* Section 5 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Third-Party Data Sharing</h2>
            <p className="text-slate-700 mb-4">
              We do not sell or rent your personal information to third parties. However:
            </p>
            <ul className="space-y-3 text-slate-700 ml-4">
              <li>
                <strong>OAuth Providers:</strong> When you connect your account, you authorize us to access your data from Facebook, LinkedIn, and eBay. These platforms have their own privacy policies.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information when required by law or to protect our legal rights.
              </li>
              <li>
                <strong>Service Providers:</strong> We use trusted third-party services for hosting, email delivery, and analytics. These providers are bound by confidentiality agreements.
              </li>
            </ul>
          </div>

          {/* Section 6 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Your Rights</h2>
            <p className="text-slate-700 mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="space-y-2 text-slate-700 ml-4">
              <li>• <strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li>• <strong>Right to Correction:</strong> Update or correct inaccurate information</li>
              <li>• <strong>Right to Deletion:</strong> Request deletion of your data (see Section 4)</li>
              <li>• <strong>Right to Disconnect:</strong> Revoke access to connected OAuth accounts at any time</li>
              <li>• <strong>Right to Portability:</strong> Request your data in a portable format</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. OAuth Permissions</h2>
            <p className="text-slate-700 mb-4">
              When you connect your account to third-party services, you grant us specific permissions:
            </p>
            <div className="space-y-4 ml-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold text-slate-900">eBay OAuth</p>
                <p className="text-slate-700 text-sm">Permissions: Read-only access to your eBay profile, feedback, and transaction history</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold text-slate-900">Facebook OAuth</p>
                <p className="text-slate-700 text-sm">Permissions: Read-only access to your public profile, email, location, and liked pages</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold text-slate-900">LinkedIn OAuth</p>
                <p className="text-slate-700 text-sm">Permissions: Read-only access to your profile, email, and professional information</p>
              </div>
            </div>
            <p className="text-slate-700 mt-4">
              You can disconnect any OAuth account at any time in Account Settings → Integrations. This will revoke our access to that service.
            </p>
          </div>

          {/* Section 8 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Cookies and Tracking</h2>
            <p className="text-slate-700 mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="space-y-2 text-slate-700 ml-4">
              <li>• Keep you logged in to your account</li>
              <li>• Remember your preferences</li>
              <li>• Analyze site usage and performance</li>
              <li>• Prevent fraud and enhance security</li>
            </ul>
            <p className="text-slate-700 mt-4">
              You can control cookie settings through your browser. Disabling cookies may affect site functionality.
            </p>
          </div>

          {/* Section 9 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Data Retention</h2>
            <p className="text-slate-700">
              We retain your personal information for as long as your account is active or as needed to provide services. After account deletion, most data is removed within 30 days, though some may be retained for legal compliance or fraud prevention purposes.
            </p>
          </div>

          {/* Section 10 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Children's Privacy</h2>
            <p className="text-slate-700">
              Tradebilia is not intended for users under 18 years of age. We do not knowingly collect information from children. If we become aware that we have collected information from a child, we will delete it immediately.
            </p>
          </div>

          {/* Section 11 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of Tradebilia after changes constitutes your acceptance of the updated Privacy Policy.
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-slate-100 rounded-lg p-8 mt-12">
            <div className="flex items-start gap-3 mb-4">
              <Mail className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
              </div>
            </div>
            <p className="text-slate-700 mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="space-y-2 text-slate-700">
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@tradebilia.com" className="text-blue-600 hover:underline">
                  privacy@tradebilia.com
                </a>
              </p>
              <p>
                <strong>Mailing Address:</strong>
                <br />
                Tradebilia
                <br />
                Privacy Team
                <br />
                United States
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
