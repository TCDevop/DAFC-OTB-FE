'use client';

// Microsoft redirect callback page.
// After loginRedirect, Microsoft sends the user back here with the auth code.
// AuthContext.tsx useEffect calls handleRedirectPromise() and navigates to '/' on success.
export default function MicrosoftCallbackPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#D7B797] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#666666] font-['Montserrat']">Completing sign in...</p>
      </div>
    </div>
  );
}
