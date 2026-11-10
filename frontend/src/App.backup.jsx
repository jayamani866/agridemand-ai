import { useState } from 'react'
import {
  Sprout, LayoutDashboard, Users, Package, ShoppingCart,
  BrainCircuit, Wallet, Settings, Bell, Search, ArrowUpRight,
  TrendingUp, MapPin, Leaf, ChevronRight, Menu
} from 'lucide-react'

const menu = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Buyer Requests', icon: ShoppingCart },
  { name: 'Farmer Inventory', icon: Package },
  { name: 'AI Matching', icon: BrainCircuit },
  { name: 'Orders', icon: Wallet },
  { name: 'Farmers', icon: Users },
]

const inventory = [
  { crop: 'Tomato', location: 'Salem', quantity: '600 kg', price: '₹22/kg', color: '#f87171' },
  { crop: 'Onion', location: 'Salem', quantity: '500 kg', price: '₹28/kg', color: '#c084fc' },
  { crop: 'Coconut', location: 'Dharmapuri', quantity: '1,000 kg', price: '₹32/kg', color: '#a3e635' },
  { crop: 'Banana', location: 'Erode', quantity: '600 kg', price: '₹18/kg', color: '#facc15' },
]

function App() {
  const [active, setActive] = useState('Overview')
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div className="min-h-screen bg-[#0b1410] text-gray-100 md:flex">
      <aside className={`${mobileMenu ? 'block' : 'hidden'} md:flex w-full md:w-64 shrink-0 border-r border-[#26372d] bg-[#101a14] p-5 md:min-h-screen md:flex-col`}>
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-xl bg-[#1d3b29] p-2.5 text-green-300">
            <Sprout size={25} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AgriDemand<span className="text-green-400"> AI</span></h1>
            <p className="text-xs muted">Smart agricultural supply</p>
          </div>
        </div>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest muted">Workspace</p>
        <nav className="space-y-1">
          {menu.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => { setActive(name); setMobileMenu(false) }}
              className={`sidebar-link ${active === name ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{name}</span>
              {active === name && <ChevronRight className="ml-auto" size={16} />}
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden rounded-2xl border border-[#31523b] bg-[#172a1e] p-4 md:block">
          <Sprout className="mb-3 text-green-300" size={23} />
          <p className="text-sm font-semibold">Growing smarter together</p>
          <p className="mt-1 text-xs leading-5 muted">Connecting farmer supply with real buyer demand.</p>
        </div>

        <button className="sidebar-link mt-5">
          <Settings size={18} />
          <span className="text-sm">Settings</span>
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-[#26372d] bg-[#0d1711]/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              <Menu size={22} />
            </button>
            <div>
              <p className="text-sm muted">Workspace / {active}</p>
              <h2 className="font-semibold">{active}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-xl border border-[#26372d] p-2 text-gray-300">
              <Search size={18} />
            </button>
            <button className="relative rounded-xl border border-[#26372d] p-2 text-gray-300">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-green-400" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#294b34] text-sm font-bold text-green-200">
              A
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-7 p-5 md:p-8">
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-sm green">Tuesday, November 10, 2026</p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Agriculture, powered by intelligence.</h1>
              <p className="mt-2 text-sm muted">Monitor supply, discover matches and coordinate procurement.</p>
            </div>
            <button
              onClick={() => setActive('Buyer Requests')}
              className="flex items-center gap-2 rounded-xl bg-green-400 px-5 py-3 text-sm font-bold text-[#102016] hover:bg-green-300"
            >
              <ShoppingCart size={17} /> New buyer request
            </button>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Registered Farmers', value: '3', note: 'Demo farmer accounts', icon: Users },
              { label: 'Available Produce', value: '3,200 kg', note: 'Across active lots', icon: Package },
              { label: 'Buyer Requests', value: '1', note: 'Procurement demand', icon: ShoppingCart },
              { label: 'Orders Created', value: '1', note: 'Awaiting payment', icon: Wallet },
            ].map(({ label, value, note, icon: Icon }) => (
              <div className="panel p-5" key={label}>
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm muted">{label}</p>
                  <div className="rounded-xl bg-[#203629] p-2 text-green-300"><Icon size={19} /></div>
                </div>
                <p className="stat-value">{value}</p>
                <p className="mt-2 text-xs muted">{note}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="panel relative overflow-hidden p-6 xl:col-span-2">
              <div className="relative z-[1]">
                <div className="mb-4 flex items-center gap-2 text-green-300">
                  <BrainCircuit size={20} />
                  <span className="text-sm font-semibold">AgriDemand Intelligence</span>
                </div>
                <h3 className="max-w-xl text-2xl font-bold leading-tight md:text-3xl">
                  Match agricultural demand with distributed farmer supply.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 muted">
                  Our matching engine combines multiple farmer lots to fulfil a buyer's requested quantity.
                </p>
                <button
                  onClick={() => setActive('AI Matching')}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-green-400 px-4 py-3 text-sm font-bold text-[#102016]"
                >
                  Explore AI matching <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="pointer-events-none absolute -right-8 -top-12 h-64 w-64 rounded-full border-[35px] border-[#1d3b29] opacity-60" />
              <Leaf className="absolute bottom-8 right-12 text-[#477d51] opacity-40" size={100} />
            </div>

            <div className="panel p-6">
              <h3 className="font-semibold">Latest order</h3>
              <p className="mt-1 text-xs muted">Order #1 · Demo data</p>
              <div className="my-5 rounded-xl bg-[#1a2b20] p-4">
                <p className="text-xs muted">Order value</p>
                <p className="mt-1 text-3xl font-bold">₹43,300</p>
                <span className="mt-3 inline-flex rounded-full bg-yellow-900/40 px-3 py-1 text-xs text-yellow-300">
                  Pending payment
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="muted">Crop</span><span>Tomato</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="muted">Quantity</span><span>2,000 kg</span>
              </div>
              <button onClick={() => setActive('Orders')} className="mt-5 flex items-center gap-2 text-sm font-semibold green">
                View order details <ArrowUpRight size={16} />
              </button>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26372d] p-5">
              <div>
                <h3 className="font-semibold">Available farmer inventory</h3>
                <p className="mt-1 text-xs muted">Current sample stock from the backend seed data</p>
              </div>
              <button onClick={() => setActive('Farmer Inventory')} className="text-sm green">View inventory <ArrowUpRight className="ml-1 inline" size={15} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-xs muted">
                  <tr>
                    <th className="px-5 py-4 font-medium">Produce</th>
                    <th className="px-5 py-4 font-medium">Location</th>
                    <th className="px-5 py-4 font-medium">Available stock</th>
                    <th className="px-5 py-4 font-medium">Price</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.crop} className="border-t border-[#26372d]">
                      <td className="px-5 py-4 font-semibold">
                        <span className="mr-3 inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                        {item.crop}
                      </td>
                      <td className="px-5 py-4 muted"><MapPin className="mr-1 inline" size={14} />{item.location}</td>
                      <td className="px-5 py-4">{item.quantity}</td>
                      <td className="px-5 py-4">{item.price}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-green-900/40 px-3 py-1 text-xs text-green-300">Available</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 pb-3 text-xs muted">
            <span>AgriDemand AI · Hackathon Demo</span>
            <span className="flex items-center gap-1"><TrendingUp size={14} /> Demand-first agricultural procurement</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App