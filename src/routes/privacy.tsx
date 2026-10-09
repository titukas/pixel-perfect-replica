import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { APP_NAME, PRIVACY_VERSION } from "@/lib/app-config";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${APP_NAME}` },
      { name: "description", content: `How ${APP_NAME} handles your data.` },
      { property: "og:title", content: `Privacy Policy — ${APP_NAME}` },
      { property: "og:description", content: `How ${APP_NAME} handles your data.` },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" version={PRIVACY_VERSION}>
      <p>We store your display name, email, gender selection, chores, rewards, points history and any verification photos or videos you choose to record.</p>
      <h2 className="text-xl">Who can see your data</h2>
      <p>Only you and the partner you explicitly connect with. Verification media is kept in private storage and is never public.</p>
      <h2 className="text-xl">Camera</h2>
      <p>The camera is only requested when you choose to record evidence for a chore.</p>
      <h2 className="text-xl">Your rights</h2>
      <p>You can export your data or delete your account from your profile at any time.</p>
    </LegalPage>
  ),
});
