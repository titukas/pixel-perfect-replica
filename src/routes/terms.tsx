import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { APP_NAME, TERMS_VERSION } from "@/lib/app-config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${APP_NAME}` },
      { name: "description", content: `The terms for using ${APP_NAME}.` },
      { property: "og:title", content: `Terms of Service — ${APP_NAME}` },
      { property: "og:description", content: `The terms for using ${APP_NAME}.` },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Service" version={TERMS_VERSION}>
      <p>{APP_NAME} helps two partners share household chores and exchange points for voluntary acts of kindness.</p>
      <h2 className="text-xl">Voluntary rewards</h2>
      <p>Rewards are voluntary. Either partner may decline or renegotiate any request at any time, without penalty. Points have no monetary value.</p>
      <h2 className="text-xl">Verification</h2>
      <p>Timers are self-reported and photos or videos are supporting evidence only. Neither proves a chore was completed; your partner's approval is the final decision.</p>
      <h2 className="text-xl">Your account</h2>
      <p>Keep your login private. You can disconnect from a partner or delete your account at any time from your profile.</p>
    </LegalPage>
  ),
});
