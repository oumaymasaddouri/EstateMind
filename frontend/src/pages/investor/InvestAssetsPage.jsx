import React from 'react';
import { Save, Upload } from 'lucide-react';
import { addInvestorPortfolioAsset } from '../../services/api';

const INITIAL_FORM = {
  property_name: '',
  purchase_price: '',
  current_value: '',
  monthly_rent: '',
};

export default function InvestAssetsPage() {
  const [form, setForm] = React.useState(INITIAL_FORM);
  const [status, setStatus] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      await addInvestorPortfolioAsset({
        property_name: form.property_name,
        purchase_price: Number(form.purchase_price),
        current_value: Number(form.current_value),
        monthly_rent: Number(form.monthly_rent || 0),
      });
      setForm(INITIAL_FORM);
      setStatus('Asset saved successfully. Refresh the portfolio page to see the new holding.');
    } catch (error) {
      setStatus('Unable to save the asset right now. Check that your account has investor access.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6 p-5 md:p-6">
      <div>
        <div className="flex items-center gap-2 text-[#FFB38F]">
          <Upload size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">Assets</p>
        </div>
        <h3 className="mt-2 text-2xl font-black text-white">Add or Manage Assets</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
          Keep the portfolio current by recording purchases, estimated values, and rent in one controlled form.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
          <Input label="Property name" value={form.property_name} onChange={handleChange('property_name')} placeholder="Ariana Business Center" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Purchase price (TND)" type="number" value={form.purchase_price} onChange={handleChange('purchase_price')} placeholder="275000" />
            <Input label="Current value (TND)" type="number" value={form.current_value} onChange={handleChange('current_value')} placeholder="320000" />
          </div>
          <Input label="Monthly rent (TND)" type="number" value={form.monthly_rent} onChange={handleChange('monthly_rent')} placeholder="2400" />

          {status ? <div className="rounded-2xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-4 text-sm text-gray-100">{status}</div> : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#E85C2C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save asset'}
          </button>
        </form>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-gray-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">Maintenance logic</p>
            <p className="mt-2 leading-6">
              The asset form stays narrow and explicit so each field maps to the underlying portfolio model without ambiguity.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">Best practice</p>
            <p className="mt-2 leading-6">
              Use the portfolio page immediately after saving to verify the new holding and compare its return against the rest of the book.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-[#FF6B35]/60 focus:ring-2 focus:ring-[#FF6B35]/20"
      />
    </label>
  );
}