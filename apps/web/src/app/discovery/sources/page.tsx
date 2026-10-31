"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  PlusCircle,
  Play,
  Pause,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Activity,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, MetricCard } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { DiscoverySource, SourceType } from "@umeed/contracts";

export default function DiscoverySourcesPage() {
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // New Source Form State
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("rss_feed");
  const [description, setDescription] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [license, setLicense] = useState("Open Government Data License (India)");
  const [sourceOwner, setSourceOwner] = useState("");

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discovery/sources");
      const data = await res.json();
      if (data.status === "success") {
        setSources(data.data);
      }
    } catch (err) {
      console.error("Failed to load sources", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleTriggerCrawl = async (sourceId: string) => {
    setActionLoading(sourceId);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/discovery/crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, isDryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to trigger crawl run");

      setBannerMessage(`Crawl run completed: ${data.message}`);
      fetchSources();
    } catch (err) {
      setBannerMessage(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePause = async (sourceId: string, currentHealth: string) => {
    setActionLoading(sourceId);
    setBannerMessage(null);
    try {
      const shouldPause = currentHealth !== "paused";
      const res = await fetch(`/api/discovery/sources/${sourceId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: shouldPause }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to toggle pause status");

      setBannerMessage(data.message);
      fetchSources();
    } catch (err) {
      setBannerMessage(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("create");
    setBannerMessage(null);
    try {
      const sourceId = `src_${domain.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now().toString(36)}`;
      const payload = {
        sourceId,
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        sourceType,
        description: description.trim(),
        homepageUrl: homepageUrl.trim(),
        feedUrl: feedUrl.trim() || null,
        sitemapUrl: null,
        termsUrl: null,
        license: license.trim(),
        sourceOwner: sourceOwner.trim() || "Public Entity",
        approved: true, // coordinator registering it approves it
        approvedBy: "coord_manual",
        approvedAt: new Date().toISOString(),
        robotsStatus: "allowed",
        crawlIntervalMinutes: 60,
        maxPagesPerRun: 10,
        maxDepth: 1,
        requestsPerMinute: 10,
        lastCrawledAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        consecutiveFailures: 0,
        healthStatus: "healthy",
        isSynthetic: false,
      };

      const res = await fetch("/api/discovery/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to register source");

      setBannerMessage(`Source '${name}' successfully registered and approved.`);
      setModalOpen(false);
      // Reset form
      setName("");
      setDomain("");
      setDescription("");
      setHomepageUrl("");
      setFeedUrl("");
      fetchSources();
    } catch (err) {
      setBannerMessage(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-warm-grey-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/discovery"
                className="text-xs font-semibold text-forest-600 hover:text-coral-500 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Discovery Radar
              </Link>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-forest-800 tracking-tight">
              Approved Discovery Source Registry
            </h1>
            <p className="text-sm text-forest-600 max-w-2xl mt-1">
              Authorized public websites, RSS feeds, and open government datasets. Every source adheres to strict
              robots.txt compliance and rate limits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => setModalOpen(true)}
            >
              Register Approved Source
            </Button>
          </div>
        </div>

        {bannerMessage && (
          <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-xs font-bold text-forest-800">
            {bannerMessage}
          </div>
        )}

        {/* Source Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((src) => {
            const isPaused = src.healthStatus === "paused";
            const isLoading = actionLoading === src.sourceId;

            return (
              <Card key={src.sourceId} className="flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant={isPaused ? "neutral" : "positive"}>
                          {src.healthStatus.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] font-mono font-bold text-forest-600 uppercase">
                          {src.sourceType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-forest-800 line-clamp-2 leading-snug">
                        {src.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-forest-600 line-clamp-3 leading-relaxed">
                    {src.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-warm-grey-200 text-xs text-forest-700">
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500 font-mono text-[10px]">Domain:</span>
                      <span className="font-mono font-bold text-[11px]">{src.domain}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500 font-mono text-[10px]">License:</span>
                      <span className="text-[11px] font-medium truncate max-w-[180px]">{src.license}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500 font-mono text-[10px]">Robots.txt:</span>
                      <span className="text-[10px] font-mono font-bold uppercase text-forest-800">
                        {src.robotsStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500 font-mono text-[10px]">Crawl Interval:</span>
                      <span className="text-[10px] font-mono text-forest-800 font-bold">
                        Every {src.crawlIntervalMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-warm-grey-200 mt-4 flex items-center justify-between gap-2">
                  <a
                    href={src.homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-forest-600 hover:text-coral-500 font-semibold"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleTogglePause(src.sourceId, src.healthStatus)}
                    >
                      {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                      {isPaused ? "Resume" : "Pause"}
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isLoading || isPaused}
                      onClick={() => handleTriggerCrawl(src.sourceId)}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                      Crawl Now
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Modal: Register Approved Source */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-forest-950/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-warm-grey-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-warm-grey-200 pb-3">
                <h3 className="font-editorial text-lg font-bold text-forest-800">
                  Register Approved Public Source
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded text-forest-600 hover:bg-warm-grey-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-forest-700 mb-1">Source Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi Municipal Animal Shelter Public Notice Board"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-forest-700 mb-1">Domain Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. mcdonline.nic.in"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-forest-700 mb-1">Source Type</label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value as SourceType)}
                      className="w-full p-2.5 rounded-xl border border-warm-grey-300 bg-white focus:outline-none focus:ring-2 focus:ring-forest-800"
                    >
                      <option value="rss_feed">RSS Feed</option>
                      <option value="atom_feed">Atom Feed</option>
                      <option value="xml_sitemap">XML Sitemap</option>
                      <option value="open_dataset">Open Dataset</option>
                      <option value="approved_html">Approved HTML</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-forest-700 mb-1">Homepage URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://mcdonline.nic.in"
                    value={homepageUrl}
                    onChange={(e) => setHomepageUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-forest-700 mb-1">Feed / Sitemap URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://mcdonline.nic.in/feed.xml"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-forest-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Explain what distress signals or announcements this source publishes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-warm-grey-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-grey-200">
                  <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={actionLoading === "create"}>
                    {actionLoading === "create" ? "Registering..." : "Approve & Register"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
