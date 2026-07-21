import React from "react";
import { Gavel, ShieldAlert, Scale, FileText, AlertCircle } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-lg text-slate-600">
            Last updated: <span className="font-semibold">July 21, 2026</span>
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-slate-700 leading-relaxed mb-6">
            Welcome to Tradebilia. These Terms of Service ("Terms") govern your access to and use of our website and services. By using Tradebilia, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
          </p>

          {/* Section 1 */}
          <div className="mb-10">
            <div className="flex items-start gap-3 mb-4">
              <Gavel className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Marketplace Disclaimer</h2>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <p className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                IMPORTANT DISCLOSURE
              </p>
              <p className="text-slate-700 leading-relaxed italic">
                Tradebilia is a marketplace platform that facilitates connections between collectors. We do not act as a middle-man, escrow service, or guarantor for any trades. Tradebilia is not liable for trades gone wrong, lost items, or fraudulent activity between users. Users are solely responsible for verifying the reputation of their counterparts and conducting trades safely.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Eligibility</h2>
            <p className="text-slate-700 mb-4">
              To use Tradebilia, you must:
            </p>
            <ul className="space-y-2 text-slate-700 ml-4">
              <li>• Be at least 18 years of age</li>
              <li>• Have the legal capacity to enter into binding contracts</li>
              <li>• Not be barred from using the services under applicable law</li>
              <li>• Provide accurate and complete registration information</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="mb-10">
            <div className="flex items-start gap-3 mb-4">
              <Scale className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Trading Rules</h2>
              </div>
            </div>
            <ul className="space-y-4 text-slate-700 ml-4">
              <li>
                <strong>Shipping:</strong> Each trader is responsible for paying their own shipping costs unless otherwise agreed upon in the trade discussion.
              </li>
              <li>
                <strong>Cash Trades:</strong> Cash-only trades or trades involving cash are allowed. However, users are responsible for the secure exchange of funds; Tradebilia does not process or hold cash for trades.
              </li>
              <li>
                <strong>Item Representation:</strong> Users must provide accurate descriptions and images of items. Misrepresenting items is a violation of these Terms.
              </li>
              <li>
                <strong>Completion:</strong> A trade is considered completed when both users confirm receipt of their items on the platform.
              </li>
              <li>
                <strong>Modifications:</strong> Once a trade is agreed upon, the items involved remain visible but are marked as "In Trade" until the transaction is completed or cancelled.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. User Conduct</h2>
            <p className="text-slate-700 mb-4">You agree not to:</p>
            <ul className="space-y-2 text-slate-700 ml-4">
              <li>• Use the service for any illegal purpose</li>
              <li>• Post fraudulent or misleading listings</li>
              <li>• Harass or abuse other users</li>
              <li>• Attempt to circumvent our security measures</li>
              <li>• Scrape data from the platform without authorization</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Account Suspension</h2>
            <p className="text-slate-700">
              We reserve the right to suspend or terminate accounts that violate these Terms. Admins have the authority to suspend users, and suspended users will be tracked in our system. Suspensions may be removed at our sole discretion.
            </p>
          </div>

          {/* Section 6 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-700">
              The Tradebilia logo, design, and content are the property of Tradebilia. Users retain ownership of the content they post but grant us a license to display it on the platform.
            </p>
          </div>

          {/* Section 7 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-700">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEBILIA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE OR ANY TRADES CONDUCTED THEREON.
            </p>
          </div>

          {/* Section 8 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Governing Law</h2>
            <p className="text-slate-700">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the Company is headquartered, without regard to its conflict of law principles.
            </p>
          </div>

          {/* Section 9 */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Changes to Terms</h2>
            <p className="text-slate-700">
              We may update these Terms from time to time. Your continued use of the service after changes are posted constitutes your acceptance of the new Terms.
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-slate-100 rounded-lg p-8 mt-12">
            <div className="flex items-start gap-3 mb-4">
              <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
              </div>
            </div>
            <p className="text-slate-700 mb-4">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-blue-600 font-semibold">legal@tradebilia.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
