'use client'

import { Icon } from '@iconify/react'

const MOCK_PLAN = {
  name: 'Pro Plan',
  price: 49,
  interval: '/month',
  status: 'Active',
  renewsOn: 'Feb 20, 2026',
  usagePercent: 85,
  usageLabel: '8,500 of 10,000 monthly active contacts used',
}

const MOCK_PAYMENT = {
  brand: 'Visa',
  last4: '4242',
  exp: '12/2028',
  isDefault: true,
}

const MOCK_ADDRESS = {
  name: 'Acme Corp HQ',
  lines: ['123 Innovation Drive', 'Suite 400', 'San Francisco, CA 94107', 'United States'],
  taxId: 'US-99283921',
}

const MOCK_INVOICES = [
  { id: 'INV-2024-001', date: 'Jan 20, 2024', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2023-012', date: 'Dec 20, 2023', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2023-011', date: 'Nov 20, 2023', amount: '$49.00', status: 'Paid' },
]

export default function BillingSettings() {
  return (
    <div className="max-w-4xl space-y-10 mb-20" data-settings="billing-section">
      {/* Current Plan */}
      <section data-settings="billing-current-plan">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5" data-settings="billing-heading">
          Current Plan
        </h3>
        <div
          className="billing-glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden group"
          data-settings="billing-plan-card"
        >
          <div
            className="absolute -right-10 -top-10 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl group-hover:bg-[#3B82F6]/20 transition-all duration-500"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="px-3 py-1 bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-bold uppercase tracking-wider rounded-full"
                  data-settings="billing-plan-badge"
                >
                  {MOCK_PLAN.status}
                </span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{MOCK_PLAN.name}</h2>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-slate-800 dark:text-white">${MOCK_PLAN.price}</span>
                <span className="text-slate-500 dark:text-gray-400 font-medium">{MOCK_PLAN.interval}</span>
              </div>
              <p className="text-slate-500 dark:text-gray-400 text-sm flex items-center gap-2">
                <Icon icon="material-symbols:calendar-month" className="text-base" aria-hidden />
                Renews automatically on{' '}
                <span className="font-semibold text-slate-700 dark:text-gray-300">{MOCK_PLAN.renewsOn}</span>
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                className="w-full md:w-auto px-8 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                data-settings="billing-upgrade-btn"
                aria-label="Upgrade plan"
              >
                Upgrade Plan
                <Icon icon="material-symbols:arrow-forward" className="text-sm" aria-hidden />
              </button>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-gray-600/60" data-settings="billing-usage">
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">
              <span>Plan Usage</span>
              <span>{MOCK_PLAN.usagePercent}% Used</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full w-[85%] bg-gradient-to-r from-blue-400 to-[#3B82F6] rounded-full"
                data-settings="billing-usage-bar"
              />
            </div>
            <div className="mt-2 text-xs text-slate-400 dark:text-gray-500">{MOCK_PLAN.usageLabel}</div>
          </div>
        </div>
      </section>

      {/* Payment Method & Billing Address grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-settings="billing-grid">
        <section data-settings="billing-payment-method">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5" data-settings="billing-heading">
            Payment Method
          </h3>
          <div
            className="billing-glass-card rounded-2xl p-6 h-full flex flex-col justify-between"
            data-settings="billing-payment-card"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-8 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-gray-600 rounded flex items-center justify-center"
                    data-settings="billing-card-brand"
                  >
                    <span className="text-[10px] font-bold text-slate-600 dark:text-gray-300">VISA</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-700 dark:text-gray-200 text-sm">
                        {MOCK_PAYMENT.brand} ending in {MOCK_PAYMENT.last4}
                      </p>
                      {MOCK_PAYMENT.isDefault && (
                        <span
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 text-[10px] font-bold uppercase rounded border border-slate-200 dark:border-gray-600"
                          data-settings="billing-default-badge"
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Expires {MOCK_PAYMENT.exp}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors cursor-pointer"
                  data-settings="billing-payment-update"
                  aria-label="Update payment method"
                >
                  Update
                </button>
              </div>
            </div>
            <button
              type="button"
              className="w-full py-2.5 border border-dashed border-slate-300 dark:border-gray-600 text-slate-500 dark:text-gray-400 font-medium rounded-xl hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-all flex items-center justify-center gap-2"
              data-settings="billing-add-payment"
              aria-label="Add payment method"
            >
              <Icon icon="material-symbols:add" className="text-xl" aria-hidden />
              Add Payment Method
            </button>
          </div>
        </section>

        <section data-settings="billing-address">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5" data-settings="billing-heading">
            Billing Address
          </h3>
          <div
            className="billing-glass-card rounded-2xl p-6 h-full"
            data-settings="billing-address-card"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                <p className="font-semibold text-slate-800 dark:text-white text-base mb-2">{MOCK_ADDRESS.name}</p>
                {MOCK_ADDRESS.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                data-settings="billing-address-edit"
                aria-label="Edit billing address"
              >
                <Icon icon="material-symbols:edit" className="text-base" aria-hidden />
                Edit
              </button>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-gray-600/50">
              <p className="text-xs text-slate-400 dark:text-gray-500">Tax ID: {MOCK_ADDRESS.taxId}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Invoices */}
      <section data-settings="billing-invoices">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white" data-settings="billing-heading">
            Invoices
          </h3>
          <button
            type="button"
            className="text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
            data-settings="billing-invoices-view-all"
            aria-label="View all invoices"
          >
            View all
          </button>
        </div>
        <div
          className="billing-glass-card rounded-2xl overflow-hidden border border-white/60 dark:border-gray-600/60 shadow-sm"
          data-settings="billing-invoices-table-wrap"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-settings="billing-invoices-table">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-gray-600/60 bg-white/30 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400 font-semibold">
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 dark:divide-gray-700/50 text-sm">
                {MOCK_INVOICES.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-white/40 dark:hover:bg-gray-700/30 transition-colors"
                    data-settings="billing-invoice-row"
                  >
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-gray-200">{inv.id}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400">{inv.date}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-gray-200">{inv.amount}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                        data-settings="billing-invoice-status"
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-[#3B82F6] transition-colors"
                        aria-label={`Download ${inv.id}`}
                      >
                        <Icon icon="material-symbols:download" className="text-xl" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
