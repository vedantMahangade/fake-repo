"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { marketplaceCollectionUrl } from "../../lib/routes.js";

export default function CollectionCard({
  item,
  accountId,
  loading,
  onBuy,
  buySuccess,
  authPromptId,
  embedded = false,
}) {
  const pct = item.maxSupply > 0 ? (item.mintedCount / item.maxSupply) * 100 : 0;
  const showAuthPrompt = authPromptId === item.tokenId;

  return (
    <motion.li {...fadeUp} transition={fadeUpTransition}>
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            {embedded ? (
              <h2 className="text-lg font-medium tracking-tight">{item.name}</h2>
            ) : (
              <Link href={marketplaceCollectionUrl(item.tokenId)}>
                <h2 className="text-lg font-medium tracking-tight hover:text-accent transition-colors">
                  {item.name}
                </h2>
              </Link>
            )}
            <p className="text-muted text-xs mt-1 font-mono">{item.symbol} · {item.tokenId}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {item.soldOut ? (
              <Badge variant="default">Sold out</Badge>
            ) : (
              <Badge variant="accent">{item.remaining} left</Badge>
            )}
            {(item.resaleListingCount ?? 0) > 0 && !embedded && (
              <Badge variant="pending">
                {item.resaleListingCount} resale{item.resaleListingCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>Supply</span>
            <span>{item.mintedCount} / {item.maxSupply}</span>
          </div>
          <div className="h-0.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/70 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Face value</p>
            <p className="text-2xl font-medium text-accent">{item.faceValueHbar} <span className="text-sm text-muted">HBAR</span></p>
          </div>
          {!item.soldOut && (
            <Button
              onClick={() => (embedded ? onBuy() : onBuy(item.tokenId))}
              loading={embedded ? loading : loading === item.tokenId}
              disabled={!!loading}
            >
              Buy
            </Button>
          )}
        </div>

        {!embedded && (
          <p className="text-xs text-muted pt-2 border-t border-border">
            <Link href={marketplaceCollectionUrl(item.tokenId)} className="text-accent hover:text-accent-dim">
              View collection
            </Link>
            {(item.resaleListingCount ?? 0) > 0 && (
              <>
                {" · "}
                {item.resaleListingCount} ticket{item.resaleListingCount !== 1 ? "s" : ""} listed for resale
              </>
            )}
          </p>
        )}

        {buySuccess?.tokenId === item.tokenId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-success/20 pt-4 text-sm text-success"
          >
            Ticket #{buySuccess.serial} minted.{" "}
            <Link href={`/wallet`} className="underline hover:text-success/80">
              View ticket
            </Link>
            {buySuccess.hashscanUrl && (
              <>
                {" · "}
                <a href={buySuccess.hashscanUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Transaction
                </a>
              </>
            )}
          </motion.div>
        )}

        {showAuthPrompt && !accountId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border pt-4 text-sm text-muted"
          >
            Sign in to purchase.{" "}
            <Link href="/login" className="text-accent">Log in</Link>
            {" or "}
            <Link href="/onboard" className="text-accent">create a wallet</Link>
          </motion.div>
        )}
      </Card>
    </motion.li>
  );
}
