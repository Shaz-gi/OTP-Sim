// pages/privacy-policy.tsx
import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-6 py-12">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Privacy Policy
        </h1>

        <p className="text-gray-600 mb-4">
          At <span className="font-semibold">OTP Sim</span>, we respect your privacy and are
          committed to protecting your personal information. This Privacy Policy
          explains how we collect, use, and safeguard your data.
        </p>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          1. Information We Collect
        </h2>
        <p className="text-gray-600 mb-4">
          We may collect information such as your email, device information, and
          app usage data to improve our services and provide better customer
          support.
        </p>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          2. How We Use Your Information
        </h2>
        <ul className="list-disc list-inside text-gray-600 mb-4">
          <li>To provide and improve our services</li>
          <li>To process payments and transactions</li>
          <li>To communicate with you about updates</li>
          <li>To ensure compliance with legal obligations</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          3. Data Security
        </h2>
        <p className="text-gray-600 mb-4">
          We implement industry-standard security measures to protect your data.
          However, please note that no method of electronic transmission is 100%
          secure.
        </p>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          4. Third-Party Services
        </h2>
        <p className="text-gray-600 mb-4">
          We may use third-party services (e.g., payment processors) that have
          their own privacy policies. We encourage you to review their policies
          before using their services.
        </p>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          5. Your Rights
        </h2>
        <p className="text-gray-600 mb-4">
          You may request access, correction, or deletion of your data at any
          time by contacting us.
        </p>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          6. Changes to This Policy
        </h2>
        <p className="text-gray-600 mb-4">
          We may update this Privacy Policy from time to time. Any changes will
          be posted on this page with a revised date.
        </p>

        <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
          7. Contact Us
        </h2>
        <p className="text-gray-600">
          If you have any questions about this Privacy Policy, please contact us
          at <span className="text-blue-600">support@otpsim.com</span>.
        </p>

        <p className="text-sm text-gray-500 mt-8 text-center">
          © {new Date().getFullYear()} OTP Sim. All rights reserved.
        </p>
      </div>
    </div>
  );
}
