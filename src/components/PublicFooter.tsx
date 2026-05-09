import { Link } from "react-router-dom";
import { Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";

const contactEmail = "exehassan62@gmail.com";
const contactPhone = "+91 85910 79598";
const whatsappHref = "https://wa.me/918591079598";

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1fr_1.2fr] lg:px-8">
        <div>
          <Link className="flex items-center gap-3" to="/">
            <span className="grid size-10 place-items-center rounded-lg bg-brand text-white">
              <ShieldCheck aria-hidden="true" size={22} />
            </span>
            <span className="text-lg font-extrabold tracking-normal">AutoAudit.ai</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-quiet">
            SaaS waste control for teams that want clearer vendor spend, renewal visibility, and practical action workflows.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <strong className="text-sm font-extrabold">Product</strong>
            <div className="mt-3 grid gap-2 text-sm font-bold text-quiet">
              <Link className="hover:text-brand" to="/#features">Features</Link>
              <Link className="hover:text-brand" to="/#how-it-works">How it works</Link>
              <Link className="hover:text-brand" to="/#sample-output">Sample output</Link>
              <Link className="hover:text-brand" to="/pricing">Pricing</Link>
              <Link className="hover:text-brand" to="/contact">Contact</Link>
              <Link className="hover:text-brand" to="/contact">Custom plan</Link>
              <Link className="hover:text-brand" to="/signup?plan=trial">Free trial</Link>
            </div>
          </div>
          <div>
            <strong className="text-sm font-extrabold">Guide</strong>
            <div className="mt-3 grid gap-2 text-sm font-bold text-quiet">
              <Link className="hover:text-brand" to="/starter-guide">Starter guide</Link>
              <Link className="hover:text-brand" to="/starter-guide#step-by-step">Step-by-step use</Link>
              <Link className="hover:text-brand" to="/starter-guide#why-choose">Why choose AutoAudit</Link>
              <Link className="hover:text-brand" to="/starter-guide#pros">Pros</Link>
              <Link className="hover:text-brand" to="/starter-guide#subscription-risk">Cost of ignoring subscriptions</Link>
            </div>
          </div>
          <div>
            <strong className="text-sm font-extrabold">Legal</strong>
            <div className="mt-3 grid gap-2 text-sm font-bold text-quiet">
              <Link className="hover:text-brand" to="/about-developer">Founder</Link>
              <Link className="hover:text-brand" to="/privacy">Privacy</Link>
              <Link className="hover:text-brand" to="/terms">Terms</Link>
            </div>
          </div>
          <div>
            <strong className="text-sm font-extrabold">Contact</strong>
            <div className="mt-3 grid gap-2 text-sm font-bold text-quiet">
              <Link className="inline-flex items-center gap-2 hover:text-brand" to="/contact">
                <Mail aria-hidden="true" size={16} />
                Contact page
              </Link>
              <a className="inline-flex items-center gap-2 hover:text-brand" href={`mailto:${contactEmail}`}>
                <Mail aria-hidden="true" size={16} />
                Email
              </a>
              <a className="inline-flex items-center gap-2 hover:text-brand" href={`tel:${contactPhone.replace(/\s/g, "")}`}>
                <Phone aria-hidden="true" size={16} />
                {contactPhone}
              </a>
              <a className="inline-flex items-center gap-2 hover:text-brand" href={whatsappHref} rel="noreferrer" target="_blank">
                <MessageCircle aria-hidden="true" size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs font-bold text-quiet">
        (c) {new Date().getFullYear()} AutoAudit.ai | Built by Obaid. All rights reserved | Made with 💖 and ☕
      </div>
    </footer>
  );
}

export const publicContact = {
  email: contactEmail,
  phone: contactPhone,
  whatsappHref,
};
