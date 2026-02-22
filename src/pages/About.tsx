export function About() {
  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">ZeroCrumb</h1>
          <p className="text-zinc-400">Tracking your meals, one photo at a time</p>
        </div>

        {/* BreadSticks Company */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">About BreadSticks</h2>
          <p className="text-zinc-300 text-sm leading-relaxed">
            BreadSticks is a forward-thinking technology company dedicated to making nutrition tracking accessible and intuitive for everyone. We believe that understanding what you eat shouldn't require complicated spreadsheets or manual logging. Our team is passionate about combining artificial intelligence with user-friendly design to create tools that empower people to make informed choices about their health.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">Our Mission</h2>
          <p className="text-zinc-300 text-sm leading-relaxed">
            ZeroCrumb makes it simple to track your meals and understand your nutrition. Just snap a photo, and our AI analyzes your food to give you instant insights on calories, macros, and nutritional value.
          </p>
        </div>

        {/* Features */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">What We Offer</h2>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span className="text-zinc-300 text-sm">
                <strong>AI-Powered Analysis:</strong> Get accurate nutritional information from photos
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span className="text-zinc-300 text-sm">
                <strong>Meal History:</strong> Easily track your meals over time
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span className="text-zinc-300 text-sm">
                <strong>Social Feed:</strong> Share your meals with the HOPPERS community
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span className="text-zinc-300 text-sm">
                <strong>Personal Profile:</strong> Customize your experience and track your progress
              </span>
            </li>
          </ul>
        </div>

        {/* Technology */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">Technology</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-3">
            Built with modern web technologies and powered by advanced AI food recognition, HOPPERS delivers accurate, real-time nutritional insights.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              React
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              TypeScript
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              Supabase
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              AI Recognition
            </span>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">Get In Touch</h2>
          <p className="text-zinc-300 text-sm">
            Have questions or feedback? We'd love to hear from you! Join our community and help us make ZeroCrumb even better.
          </p>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  )
}
