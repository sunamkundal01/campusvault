export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-2xl font-semibold text-foreground">Terms of use</h1>
      <p>
        CampusVault is a private community platform for current NIT Srinagar students. By signing
        in or contributing, you agree to the following:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>You are a current student or alumnus of NIT Srinagar.</li>
        <li>You will not share, screenshot for re-publication, or leak content to anyone outside this platform.</li>
        <li>You will only upload OA material you have the right to share.</li>
        <li>All views are watermarked and logged. Misuse will result in your account being blocked.</li>
        <li>Three reports on a file auto-hide it pending admin review.</li>
        <li>Admins reserve the right to remove content and block accounts at their discretion.</li>
      </ul>
    </div>
  );
}
