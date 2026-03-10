"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ErrorBoundary from "../../marketing/components/ErrorBoundary";
import ComposeEmailModal from "./ComposeEmailModal";
import ReplyComposer from "./ReplyComposer";
import ThreadList from "./ThreadList";
import ThreadView from "./ThreadView";
import UniboxSidebar from "./UniboxSidebar";

interface Thread {
  id: string;
  subject: string;
  mailbox: {
    id: string;
    email: string;
    display_name: string | null;
    provider: string;
  };
  status: string;
  unread: boolean;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  lastMessage: {
    direction: "inbound" | "outbound";
    snippet: string;
    received_at: string | null;
    read: boolean;
  } | null;
  lastMessageAt: string;
  contactId?: string | null;
  listingId?: string | null;
  campaignId?: string | null;
  messageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Mailbox {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  active: boolean;
}

type FilterStatus =
  | "all"
  | "open"
  | "needs_reply"
  | "waiting"
  | "closed"
  | "ignored";
type FilterFolder =
  | "inbox"
  | "archived"
  | "starred"
  | "drafts"
  | "scheduled"
  | "recycling_bin"
  | "sent";

interface UniboxContentProps {
  /** When true, render only the three-pane layout (no Elite header/mesh). For use inside dashboard layout. */
  embedded?: boolean;
}

export default function UniboxContent({
  embedded = false,
}: UniboxContentProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadDetails, setThreadDetails] = useState<any>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [folderFilter, setFolderFilter] = useState<FilterFolder>("inbox");
  // Search-and-filtering-system pattern: keep raw input + apply debounced query for efficient filtering.
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<
    "reply" | "reply-all" | "forward" | null
  >(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [initialDraftData, setInitialDraftData] = useState<{
    draftId: string;
    to: string | string[];
    subject: string;
    html: string;
    mailboxId?: string | null;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | null;
    previewText?: string | null;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [folderCounts, setFolderCounts] = useState<
    Partial<Record<FilterFolder, number>>
  >({});
  const [statusByFolder, setStatusByFolder] = useState<
    Record<string, Record<FilterStatus, number>>
  >({});
  const [mailboxCounts, setMailboxCounts] = useState<Record<string, number>>(
    {}
  );
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectionModeVisible, setSelectionModeVisible] = useState(false);

  const handleSelectAllButtonClick = useCallback(() => {
    if (!selectionModeVisible) {
      setSelectionModeVisible(true);
    } else if (selectedThreadIds.size >= threads.length && threads.length > 0) {
      setSelectedThreadIds(new Set());
    } else {
      setSelectedThreadIds(new Set(threads.map((t) => t.id)));
    }
  }, [selectionModeVisible, selectedThreadIds.size, threads]);

  useEffect(() => {
    fetchMailboxes();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/unibox/counts", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFolderCounts(data.folders || {});
        setStatusByFolder(data.statusByFolder || {});
        setMailboxCounts(data.mailboxCounts || {});
      }
    } catch (error) {
      console.error("[UniboxContent] Error fetching counts:", error);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Debounce search input to reduce API calls while typing
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 and clear selection when filters or search change
  useEffect(() => {
    setPage(1);
    setSelectedThreadIds(new Set());
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery]);

  // Auto-refresh inbox list and counts every 2 minutes (matches backend sync cadence)
  useEffect(() => {
    const id = window.setInterval(() => {
      window.dispatchEvent(new Event("unibox-refresh"));
    }, 120000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery, page]);

  // Deselect when items no longer exist in the current tab
  useEffect(() => {
    const threadIds = new Set(threads.map((t) => t.id));
    setSelectedThreadIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(Array.from(prev).filter((id) => threadIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (selectedThread && !threadIds.has(selectedThread.id)) {
      setSelectedThread(null);
      setThreadDetails(null);
    }
  }, [threads, selectedThread?.id]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchThreads();
      fetchCounts();
      if (selectedThread) fetchThreadDetails(selectedThread.id);
    };
    window.addEventListener("unibox-refresh", handleRefresh);
    return () => window.removeEventListener("unibox-refresh", handleRefresh);
  }, [selectedThread, fetchCounts]);

  const fetchMailboxes = async () => {
    try {
      const response = await fetch("/api/mailboxes");
      if (response.ok) {
        const data = await response.json();
        setMailboxes(data.mailboxes || []);
      }
    } catch (error) {
      console.error("Error fetching mailboxes:", error);
    }
  };

  const fetchThreads = async () => {
    const isFirstPage = page === 1;
    try {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      // Scheduled view: load from email_queue (queued/processing)
      if (folderFilter === "scheduled") {
        try {
          const params = new URLSearchParams({ limit: "100" });
          if (searchQuery) params.append("search", searchQuery);
          const response = await fetch(`/api/emails/scheduled?${params}`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            const items: any[] = data.scheduled || [];
            const mapped: Thread[] = items.map((r: any) => {
              // Use scheduled send time (not created_at) for display
              const scheduledAt =
                r.scheduled_at || r.created_at || new Date().toISOString();
              const rawHtml: string = r.html || "";
              const plainFromHtml = rawHtml
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              const snippet =
                plainFromHtml.length > 220
                  ? `${plainFromHtml.slice(0, 217)}...`
                  : plainFromHtml || `To: ${r.to_email || ""}`;

              return {
                id: `scheduled-${r.id}`,
                subject: r.subject || "(Scheduled)",
                mailbox: {
                  id: r.mailbox_id || "scheduled",
                  email: r.from_email || "",
                  display_name: r.from_name || r.from_email || null,
                  provider: "scheduled",
                },
                status: r.status || "queued",
                unread: false,
                unreadCount: 0,
                starred: false,
                archived: false,
                lastMessage: {
                  direction: "outbound",
                  snippet,
                  received_at: scheduledAt,
                  read: true,
                },
                lastMessageAt: scheduledAt,
                contactId: null,
                listingId: null,
                campaignId: null,
                messageCount: 1,
                createdAt: r.created_at || null,
                updatedAt: r.created_at || null,
              };
            });

            setFolderCounts((prev) => ({ ...prev, scheduled: mapped.length }));
            setHasMore(false);

            if (isFirstPage) {
              setThreads(mapped);
              if (!selectedThread && mapped.length > 0) {
                handleThreadSelect(mapped[0]);
              }
            } else {
              setThreads(mapped);
            }
          } else {
            // Don't silently keep stale list if the API fails (e.g. env misconfig)
            setThreads([]);
          }
        } finally {
          if (isFirstPage) setLoading(false);
          else setLoadingMore(false);
        }
        return;
      }

      // Drafts view: load from email_drafts instead of unibox threads
      if (folderFilter === "drafts") {
        try {
          const response = await fetch(`/api/emails/drafts?limit=100`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            let drafts: any[] = data.drafts || [];

            // Client-side search over subject + preview text + from email
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              drafts = drafts.filter((d) => {
                const subject = (d.subject || "").toLowerCase();
                const preview = (d.preview_text || "").toLowerCase();
                const fromEmail = (d.from_email || "").toLowerCase();
                return (
                  subject.includes(q) ||
                  preview.includes(q) ||
                  fromEmail.includes(q)
                );
              });
            }

            const mapped: Thread[] = drafts.map((d: any) => {
              const fallbackDate = new Date().toISOString();
              const lastMessageAt =
                d.updated_at || d.created_at || fallbackDate;
              const rawHtml: string = d.html_content || "";
              const plainFromHtml = rawHtml
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              const snippetSource =
                d.preview_text || plainFromHtml || "(Empty draft)";
              const snippet =
                snippetSource.length > 220
                  ? `${snippetSource.slice(0, 217)}...`
                  : snippetSource;

              return {
                id: `draft-${d.id}`,
                subject: d.subject || "(Draft)",
                mailbox: {
                  id: d.mailbox_id || "draft",
                  email: d.from_email || "",
                  display_name: d.from_name || d.from_email || null,
                  provider: "draft",
                },
                status: "draft",
                unread: false,
                unreadCount: 0,
                starred: false,
                archived: false,
                lastMessage: {
                  direction: "outbound",
                  snippet,
                  received_at: lastMessageAt,
                  read: true,
                },
                lastMessageAt,
                contactId: null,
                listingId: null,
                campaignId: null,
                messageCount: 1,
                createdAt: d.created_at || null,
                updatedAt: d.updated_at || null,
              };
            });

            setFolderCounts((prev) => ({ ...prev, drafts: mapped.length }));
            setHasMore(false);

            if (isFirstPage) {
              setThreads(mapped);
              if (!selectedThread && mapped.length > 0) {
                handleThreadSelect(mapped[0]);
              }
            } else {
              setThreads(mapped);
            }
          }
        } finally {
          if (isFirstPage) setLoading(false);
          else setLoadingMore(false);
        }
        return;
      }

      const params = new URLSearchParams();
      if (selectedMailboxId) params.append("mailboxId", selectedMailboxId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (folderFilter === "recycling_bin")
        params.append("folder", "recycling_bin");
      else if (folderFilter === "archived") params.append("folder", "archived");
      else if (folderFilter === "starred") params.append("folder", "starred");
      else if (folderFilter === "sent") params.append("folder", "sent");
      else if (folderFilter === "inbox") params.append("folder", "inbox");
      params.append("page", page.toString());
      params.append("pageSize", "50");

      const response = await fetch(`/api/unibox/threads?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const newThreads = data.threads || [];
        const total = data.pagination?.total ?? 0;
        const totalPages = data.pagination?.totalPages ?? 1;
        // Folder counts come from GET /api/unibox/counts; don't overwrite here
        setHasMore(page < totalPages);
        if (isFirstPage) {
          setThreads(newThreads);
          if (!selectedThread && newThreads.length > 0) {
            handleThreadSelect(newThreads[0]);
          }
        } else {
          setThreads((prev) => {
            const seen = new Set(prev.map((t) => t.id));
            const appended = newThreads.filter((t: Thread) => !seen.has(t.id));
            return appended.length ? [...prev, ...appended] : prev;
          });
        }
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      if (isFirstPage) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      setLoadingThread(true);
      // Scheduled detail view: fetch full item from /api/emails/scheduled/[id]
      if (threadId.startsWith("scheduled-")) {
        const queueId = threadId.replace("scheduled-", "");
        try {
          const response = await fetch(`/api/emails/scheduled/${queueId}`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            const r = data.scheduled;
            if (r) {
              const rawHtml: string = r.html || "";
              const plainFromHtml = rawHtml
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              const snippet =
                plainFromHtml.length > 220
                  ? `${plainFromHtml.slice(0, 217)}...`
                  : plainFromHtml || `To: ${r.to_email || ""}`;
              const threadDetail = {
                id: threadId,
                subject: r.subject || "(Scheduled)",
                status: r.status || "queued",
                unread: false,
                starred: false,
                archived: false,
                mailbox: {
                  id: r.mailbox_id || "scheduled",
                  email: r.from_email || "",
                  display_name: r.from_name || r.from_email || null,
                  provider: "scheduled",
                },
                messages: [
                  {
                    id: `scheduled-msg-${threadId}`,
                    direction: "outbound" as const,
                    subject: r.subject || "(Scheduled)",
                    snippet,
                    body_html: r.html || "",
                    body_plain: plainFromHtml,
                    received_at: null,
                    sent_at: r.scheduled_at || r.created_at,
                    read: true,
                    email_participants: [
                      {
                        type: "from" as const,
                        email: r.from_email || "",
                        name: r.from_name || null,
                      },
                      {
                        type: "to" as const,
                        email: r.to_email || "",
                        name: null,
                      },
                    ],
                    email_attachments: [],
                  },
                ],
                lastMessageAt: r.scheduled_at || r.created_at,
                contact: undefined,
                listing: undefined,
                campaign: undefined,
              };
              setThreadDetails(threadDetail);
            } else {
              setThreadDetails(null);
            }
          } else {
            setThreadDetails(null);
          }
        } catch {
          setThreadDetails(null);
        }
        setLoadingThread(false);
        return;
      }

      // Draft detail view uses email_drafts instead of unibox threads
      if (threadId.startsWith("draft-")) {
        const draftId = threadId.replace("draft-", "");
        const response = await fetch(`/api/emails/drafts/${draftId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const d = data.draft;
          if (d) {
            const fallbackDate = new Date().toISOString();
            const lastMessageAt = d.updated_at || d.created_at || fallbackDate;
            const rawHtml: string = d.html_content || "";
            const plainFromHtml = rawHtml
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const snippetSource =
              d.preview_text || plainFromHtml || "(Empty draft)";
            const snippet =
              snippetSource.length > 220
                ? `${snippetSource.slice(0, 217)}...`
                : snippetSource;

            const toEmails: string[] = Array.isArray(d.to_emails)
              ? d.to_emails
              : [];

            const message = {
              id: `draft-msg-${d.id}`,
              direction: "outbound" as const,
              subject: d.subject || "(Draft)",
              snippet,
              body_html: d.html_content || "",
              body_plain: plainFromHtml,
              received_at: null,
              sent_at: lastMessageAt,
              read: true,
              email_participants: [
                {
                  type: "from" as const,
                  email: d.from_email || "",
                  name: d.from_name || null,
                },
                ...toEmails.map((email: string) => ({
                  type: "to" as const,
                  email,
                  name: null as string | null,
                })),
              ],
              email_attachments: [],
            };

            const threadDetail = {
              id: threadId,
              subject: d.subject || "(Draft)",
              status: "draft",
              unread: false,
              starred: false,
              archived: false,
              mailbox: {
                id: d.mailbox_id || "draft",
                email: d.from_email || "",
                display_name: d.from_name || d.from_email || null,
                provider: "draft",
              },
              messages: [message],
              lastMessageAt,
              contact: undefined,
              listing: undefined,
              campaign: undefined,
            };
            setThreadDetails(threadDetail);
          } else {
            setThreadDetails(null);
          }
        } else {
          setThreadDetails(null);
        }
      } else {
        const response = await fetch(`/api/unibox/threads/${threadId}`);
        if (response.ok) {
          const data = await response.json();
          const raw = data.thread;
          // Normalize to prevent crashes from malformed API response
          const thread: any = raw
            ? {
                ...raw,
                messages: Array.isArray(raw.messages)
                  ? raw.messages.map((m: any) => ({
                      ...m,
                      email_participants: Array.isArray(m?.email_participants)
                        ? m.email_participants
                        : [],
                      email_attachments: Array.isArray(m?.email_attachments)
                        ? m.email_attachments
                        : [],
                    }))
                  : [],
              }
            : null;
          setThreadDetails(thread);
        } else {
          setThreadDetails(null);
        }
      }
    } catch (error) {
      console.error("[UniboxContent] Error fetching thread details:", error);
      setThreadDetails(null);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleThreadSelect = useCallback((thread: Thread) => {
    try {
      setSelectedThread(thread);
      setThreadDetails(null); // Clear previous while loading
      fetchThreadDetails(thread.id);
    } catch (err) {
      console.error("[UniboxContent] handleThreadSelect error:", err);
      setThreadDetails(null);
    }
  }, []);

  const handleReply = () => {
    setComposerMode("reply");
    setShowComposer(true);
  };

  const handleReplyAll = () => {
    setComposerMode("reply-all");
    setShowComposer(true);
  };

  const handleForward = () => {
    setComposerMode("forward");
    setShowComposer(true);
  };

  const handleComposerClose = () => {
    setShowComposer(false);
    setComposerMode(null);
  };

  const handleMoveToTrash = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-")) return;

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trash: true }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to move to Recycling");
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        recycling_bin: (prev.recycling_bin ?? 0) + 1,
        inbox: Math.max(0, (prev.inbox ?? 0) - 1),
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error moving to trash:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to move to Recycling. Please try again."
      );
    }
  };

  const handleArchiveThread = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-")) return;
    const shouldArchive = folderFilter !== "archived";

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: shouldArchive }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to update");
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        archived: Math.max(0, (prev.archived ?? 0) + (shouldArchive ? 1 : -1)),
        inbox: Math.max(0, (prev.inbox ?? 0) + (shouldArchive ? -1 : 1)),
        starred:
          shouldArchive && folderFilter === "starred"
            ? Math.max(0, (prev.starred ?? 0) - 1)
            : (prev.starred ?? 0),
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      // Only fetchCounts – optimistic filter above removes item; avoid refetch overwriting
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error archiving:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update. Please try again."
      );
    }
  };

  const handleStarThread = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-")) return;
    const currentStarred = threadDetails?.starred ?? target.starred ?? false;
    const newStarred = !currentStarred;

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ starred: newStarred }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to update");
      }
      setThreads((t) =>
        t.map((x) => (x.id === target.id ? { ...x, starred: newStarred } : x))
      );
      setFolderCounts((prev) => ({
        ...prev,
        starred: Math.max(0, (prev.starred ?? 0) + (newStarred ? 1 : -1)),
      }));
      if (threadDetails?.id === target.id) {
        setThreadDetails({ ...threadDetails, starred: newStarred });
      }
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error starring:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update. Please try again."
      );
    }
  };

  const handleRestoreFromRecycling = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (
      !target ||
      target.id.startsWith("draft-") ||
      folderFilter !== "recycling_bin"
    )
      return;

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trash: false }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to restore");
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        recycling_bin: Math.max(0, (prev.recycling_bin ?? 0) - 1),
        inbox: (prev.inbox ?? 0) + 1,
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error restoring from Recycling:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to restore. Please try again."
      );
    }
  };

  const handlePermanentDeleteThread = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (
      !target ||
      target.id.startsWith("draft-") ||
      folderFilter !== "recycling_bin"
    )
      return;
    const targetId = target.id;

    const prevThreads = threads;
    const prevSelected = selectedThread;
    const prevDetails = threadDetails;

    setThreads((t) => t.filter((x) => x.id !== targetId));
    setFolderCounts((prev) => ({
      ...prev,
      recycling_bin: Math.max(0, (prev.recycling_bin ?? 0) - 1),
    }));
    if (selectedThread?.id === targetId) {
      setSelectedThread(null);
      setThreadDetails(null);
    }

    try {
      const response = await fetch(`/api/unibox/threads/${targetId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to delete");
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error(
        "[UniboxContent] Error permanently deleting thread:",
        error
      );
      setThreads(prevThreads);
      setFolderCounts((prev) => ({
        ...prev,
        recycling_bin: prevThreads.length,
      }));
      setSelectedThread(prevSelected);
      setThreadDetails(prevDetails);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete. Please try again."
      );
    }
  };

  const handleEditDraft = async () => {
    if (
      !selectedThread ||
      !selectedThread.id.startsWith("draft-") ||
      !threadDetails
    )
      return;
    const draftId = selectedThread.id.replace("draft-", "");
    const msg = threadDetails.messages?.[0];
    const toEmails =
      msg?.email_participants
        ?.filter((p: { type: string }) => p.type === "to")
        ?.map((p: { email: string }) => p.email) ?? [];
    const ccEmails =
      msg?.email_participants
        ?.filter((p: { type: string }) => p.type === "cc")
        ?.map((p: { email: string }) => p.email) ?? [];
    const bccEmails =
      msg?.email_participants
        ?.filter((p: { type: string }) => p.type === "bcc")
        ?.map((p: { email: string }) => p.email) ?? [];
    let subject = msg?.subject ?? threadDetails.subject ?? "";
    let html = msg?.body_html ?? "";
    let mailboxId =
      threadDetails.mailbox?.id && threadDetails.mailbox.id !== "draft"
        ? threadDetails.mailbox.id
        : selectedMailboxId;
    let replyTo: string | null = null;
    let previewText: string | null = null;
    try {
      const res = await fetch(`/api/emails/drafts/${draftId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const d = data.draft;
        if (d) {
          if (Array.isArray(d.to_emails) && d.to_emails.length > 0) {
            toEmails.length = 0;
            toEmails.push(...d.to_emails);
          }
          subject = d.subject ?? subject;
          html = d.html_content ?? html;
          mailboxId = d.mailbox_id ?? mailboxId;
          replyTo = d.reply_to ?? null;
          previewText = d.preview_text ?? null;
          if (Array.isArray(d.cc_emails) && d.cc_emails.length > 0) {
            ccEmails.length = 0;
            ccEmails.push(...d.cc_emails);
          }
          if (Array.isArray(d.bcc_emails) && d.bcc_emails.length > 0) {
            bccEmails.length = 0;
            bccEmails.push(...d.bcc_emails);
          }
        }
      }
    } catch (e) {
      console.warn(
        "[handleEditDraft] Failed to fetch draft details, using thread data",
        e
      );
    }
    setInitialDraftData({
      draftId,
      to: toEmails,
      subject,
      html,
      mailboxId: mailboxId ?? undefined,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: replyTo ?? undefined,
      previewText: previewText ?? undefined,
    });
    setShowComposeModal(true);
  };

  const handleSendDraft = async () => {
    if (!selectedThread || !selectedThread.id.startsWith("draft-")) return;
    const draftId = selectedThread.id.replace("draft-", "");
    try {
      const res = await fetch(`/api/emails/drafts/${draftId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load draft");
      const data = await res.json();
      const d = data.draft;
      if (!d) throw new Error("Draft not found");
      const toList = Array.isArray(d.to_emails) ? d.to_emails : [];
      const ccList = Array.isArray(d.cc_emails) ? d.cc_emails : [];
      const bccList = Array.isArray(d.bcc_emails) ? d.bcc_emails : [];
      const mailboxId = d.mailbox_id;
      const subject = d.subject || "(No Subject)";
      const html = d.html_content || "<p></p>";
      if (!mailboxId || toList.length === 0) {
        alert(
          "Draft is missing mailbox or recipients. Please edit and add them."
        );
        return;
      }
      const payload: Record<string, unknown> = {
        mailboxId,
        to: toList,
        subject,
        html,
      };
      if (ccList.length > 0) payload.cc = ccList;
      if (bccList.length > 0) payload.bcc = bccList;
      if (d.reply_to?.trim()) payload.replyTo = d.reply_to.trim();
      if (d.preview_text?.trim()) payload.previewText = d.preview_text.trim();
      const sendRes = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || "Failed to send");
      await fetch(`/api/emails/drafts/${draftId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setThreads((t) => t.filter((x) => x.id !== selectedThread.id));
      setFolderCounts((prev) => ({
        ...prev,
        drafts: Math.max(0, (prev.drafts ?? 0) - 1),
      }));
      setSelectedThread(null);
      setThreadDetails(null);
      fetchThreads();
      fetchCounts();
    } catch (err) {
      console.error("[UniboxContent] Error sending draft:", err);
      alert(err instanceof Error ? err.message : "Failed to send draft.");
    }
  };

  const handleCancelScheduled = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || !target.id.startsWith("scheduled-")) return;
    const queueId = target.id.replace("scheduled-", "");

    try {
      const response = await fetch(`/api/emails/scheduled/${queueId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data && data.error) || "Failed to cancel scheduled email"
        );
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        scheduled: Math.max(0, (prev.scheduled ?? 0) - 1),
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error cancelling scheduled email:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to cancel. Please try again."
      );
    }
  };

  const handleDeleteDraft = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || !target.id.startsWith("draft-")) return;
    const draftId = target.id.replace("draft-", "");
    const targetId = target.id;

    // Optimistic update: remove from UI instantly (like deals kanban)
    const prevThreads = threads;
    const prevSelected = selectedThread;
    const prevDetails = threadDetails;

    setThreads((t) => t.filter((x) => x.id !== targetId));
    setFolderCounts((prev) => ({
      ...prev,
      drafts: Math.max(0, (prev.drafts ?? 0) - 1),
    }));
    if (selectedThread?.id === targetId) {
      setSelectedThread(null);
      setThreadDetails(null);
    }

    try {
      const response = await fetch(`/api/emails/drafts/${draftId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to delete draft");
      }
      fetchThreads();
    } catch (error) {
      console.error("[UniboxContent] Error deleting draft:", error);
      setThreads(prevThreads);
      setFolderCounts((prev) => ({
        ...prev,
        drafts: prevThreads.length,
      }));
      setSelectedThread(prevSelected);
      setThreadDetails(prevDetails);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete draft. Please try again."
      );
    }
  };

  const applyBulkAction = useCallback(
    async (action: "star" | "archive" | "trash") => {
      const ids = Array.from(selectedThreadIds).filter(
        (id) => !id.startsWith("draft-") && !id.startsWith("scheduled-")
      );
      if (ids.length === 0) return;
      setBulkActionLoading(true);
      try {
        const body: Record<string, unknown> =
          action === "star"
            ? { starred: true }
            : action === "archive"
              ? { archived: true }
              : { trash: true };
        const responses = await Promise.all(
          ids.map((id) =>
            fetch(`/api/unibox/threads/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(body),
            })
          )
        );
        const failed = responses.filter((r) => !r.ok);
        if (failed.length > 0) {
          alert(
            `${ids.length - failed.length} updated. ${failed.length} failed. Please try again.`
          );
        }
        setSelectedThreadIds(new Set());
        fetchThreads();
        fetchCounts();
        if (selectedThread && ids.includes(selectedThread.id)) {
          if (action === "archive" || action === "trash") {
            setSelectedThread(null);
            setThreadDetails(null);
          } else {
            fetchThreadDetails(selectedThread.id);
          }
        }
      } catch (error) {
        console.error("[UniboxContent] Bulk action error:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Bulk action failed. Please try again."
        );
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selectedThreadIds, selectedThread]
  );

  const handleBulkStar = () => applyBulkAction("star");
  const handleBulkArchive = () => applyBulkAction("archive");
  const handleBulkTrash = () => applyBulkAction("trash");

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedThreadIds).filter(
      (id) => !id.startsWith("draft-")
    );
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/unibox/threads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ trash: false }),
          })
        )
      );
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(
          `${ids.length - failed.length} restored. ${failed.length} failed. Please try again.`
        );
      }
      setSelectedThreadIds(new Set());
      fetchThreads();
      fetchCounts();
      if (selectedThread && ids.includes(selectedThread.id)) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
    } catch (error) {
      console.error("[UniboxContent] Bulk restore error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Restore failed. Please try again."
      );
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedThreadIds, selectedThread]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const ids = Array.from(selectedThreadIds).filter(
      (id) => !id.startsWith("draft-")
    );
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/unibox/threads/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(
          `${ids.length - failed.length} deleted. ${failed.length} failed. Please try again.`
        );
      }
      setSelectedThreadIds(new Set());
      fetchThreads();
      fetchCounts();
      if (selectedThread && ids.includes(selectedThread.id)) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
    } catch (error) {
      console.error("[UniboxContent] Bulk permanent delete error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Delete failed. Please try again."
      );
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedThreadIds, selectedThread]);

  const handleComposerSend = async (data: any) => {
    if (!selectedThread) return;
    try {
      let endpoint = "";
      let body: any = {};
      if (composerMode === "reply" || composerMode === "reply-all") {
        endpoint = `/api/unibox/threads/${selectedThread.id}/reply`;
        body = {
          mailboxId: selectedThread.mailbox.id,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
          replyAll: composerMode === "reply-all",
          cc: data.cc || [],
          bcc: data.bcc || [],
        };
      } else if (composerMode === "forward") {
        endpoint = `/api/unibox/threads/${selectedThread.id}/forward`;
        body = {
          mailboxId: selectedThread.mailbox.id,
          to: data.to,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
        };
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        handleComposerClose();
        if (selectedThread) {
          fetchThreadDetails(selectedThread.id);
          fetchThreads();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to send"}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to send"}`);
    }
  };

  const unreadCount = threads.filter((t) => t.unread).length;
  const mailboxUnreadCounts = mailboxes.reduce(
    (acc, mb) => {
      acc[mb.id] = threads.filter(
        (t) => t.mailbox.id === mb.id && t.unread
      ).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) setPage((p) => p + 1);
  }, [hasMore, loadingMore, loading]);

  const FOLDER_LABELS: Record<string, string> = {
    inbox: "Inbox",
    starred: "Starred",
    sent: "Sent",
    drafts: "Drafts",
    scheduled: "Scheduled",
    archived: "Archive",
    recycling_bin: "Trash",
  };

  const threePane = (
    <>
      <UniboxSidebar
        folderFilter={folderFilter}
        onFolderFilterChange={setFolderFilter}
        onCompose={() => setShowComposeModal(true)}
        folderCounts={folderCounts}
      />

      {/* Thread list column - design 1:1 */}
      <main className="w-[420px] flex flex-col bg-white/10 border-l border-[#F3F4F6] shrink-0">
        <header className="p-6 pb-4 border-b border-[#F3F4F6]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {FOLDER_LABELS[folderFilter] ?? "Inbox"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllButtonClick}
                className={`size-9 rounded-full flex items-center justify-center shadow-sm border transition-colors ${
                  selectionModeVisible
                    ? selectedThreadIds.size >= threads.length &&
                      threads.length > 0
                      ? "bg-[#0693ff]/10 border-[#0693ff]/30 text-[#0693ff]"
                      : "bg-[#0693ff]/10 border-[#0693ff]/30 text-[#0693ff]"
                    : "bg-white border-slate-100 text-slate-600 hover:text-[#0693ff]"
                }`}
                aria-label={
                  !selectionModeVisible
                    ? "Show selection checkboxes"
                    : selectedThreadIds.size >= threads.length &&
                        threads.length > 0
                      ? "Deselect all"
                      : "Select all"
                }
                title={
                  !selectionModeVisible
                    ? "Click 1: Show checkboxes · Click 2: Select all · Click 3: Deselect all"
                    : selectedThreadIds.size >= threads.length &&
                        threads.length > 0
                      ? "Deselect all"
                      : "Select all"
                }
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  aria-hidden
                >
                  select_all
                </span>
              </button>
            </div>
          </div>
          <div className="relative pt-4 mt-4 border-t border-[#F3F4F6]">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]"
              aria-hidden
            >
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search emails"
              className="w-full bg-slate-100/50 border border-[#F3F4F6] rounded-lg py-2.5 pl-10 text-sm focus:ring-1 focus:ring-[#0693ff]/20 placeholder:text-slate-400"
              aria-label="Search emails"
            />
          </div>
        </header>
        {selectedThreadIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/20 bg-[#0693ff]/10 shrink-0">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {selectedThreadIds.size} selected
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleBulkStar}
                disabled={bulkActionLoading}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                title="Star"
                aria-label="Star selected emails"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  star
                </span>
              </button>
              <button
                type="button"
                onClick={handleBulkArchive}
                disabled={bulkActionLoading}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                title="Archive"
                aria-label="Archive selected emails"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  archive
                </span>
              </button>
              {folderFilter === "recycling_bin" && (
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={bulkActionLoading}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                  title="Restore to Inbox"
                  aria-label="Restore selected emails to Inbox"
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    aria-hidden
                  >
                    restore
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={
                  folderFilter === "recycling_bin"
                    ? handleBulkPermanentDelete
                    : handleBulkTrash
                }
                disabled={bulkActionLoading}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                title={
                  folderFilter === "recycling_bin"
                    ? "Delete permanently"
                    : "Move to Recycling"
                }
                aria-label={
                  folderFilter === "recycling_bin"
                    ? "Delete selected emails permanently"
                    : "Move selected emails to Recycling"
                }
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  delete
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedThreadIds(new Set())}
              className="text-xs font-medium text-unibox-primary hover:underline shrink-0"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto unibox-no-scrollbar min-h-0 px-3 space-y-1">
          <ThreadList
            threads={threads}
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            loading={loading}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
            showScheduledDates={folderFilter === "scheduled"}
            onDeleteDraft={
              folderFilter === "drafts"
                ? (t) => handleDeleteDraft(t)
                : undefined
            }
            onDeleteFromTrash={
              folderFilter === "recycling_bin"
                ? (t) => handlePermanentDeleteThread(t)
                : undefined
            }
            selectedIds={selectedThreadIds}
            onSelectionChange={setSelectedThreadIds}
            forceShowCheckboxes={selectionModeVisible}
          />
        </div>
      </main>

      {/* Reading pane - design 1:1 */}
      <section className="flex-1 flex flex-col bg-white/40 border-l border-[#F3F4F6] relative overflow-hidden min-w-0">
        <ErrorBoundary
          key={selectedThread?.id ?? "none"}
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400 p-6">
                <span
                  className="material-symbols-outlined text-6xl opacity-50 block mb-4"
                  aria-hidden
                >
                  error
                </span>
                <p className="text-lg font-medium mb-2">Could not load email</p>
                <p className="text-sm mb-4">
                  Try selecting another email or refresh the page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedThread(null);
                    setThreadDetails(null);
                  }}
                  className="px-4 py-2 bg-unibox-primary text-white rounded-lg hover:opacity-90 text-sm font-medium"
                >
                  Clear selection
                </button>
              </div>
            </div>
          }
        >
          {selectedThread ? (
            <ThreadView
              thread={threadDetails}
              loading={loadingThread}
              folderFilter={folderFilter}
              selectedCount={selectedThreadIds.size}
              actionTargetThread={
                selectedThreadIds.size === 1
                  ? (threads.find((t) => selectedThreadIds.has(t.id)) ??
                    selectedThread)
                  : selectedThread
              }
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDeleteDraft={handleDeleteDraft}
              onMoveToTrash={
                folderFilter !== "drafts" && folderFilter !== "recycling_bin"
                  ? handleMoveToTrash
                  : undefined
              }
              onArchive={
                folderFilter !== "drafts" ? handleArchiveThread : undefined
              }
              onStar={folderFilter !== "drafts" ? handleStarThread : undefined}
              onRestore={
                folderFilter === "recycling_bin"
                  ? handleRestoreFromRecycling
                  : undefined
              }
              onPermanentDelete={
                folderFilter === "recycling_bin"
                  ? handlePermanentDeleteThread
                  : undefined
              }
              onEditDraft={
                folderFilter === "drafts" ? handleEditDraft : undefined
              }
              onSendDraft={
                folderFilter === "drafts" ? handleSendDraft : undefined
              }
              onCancelScheduled={
                folderFilter === "scheduled" ? handleCancelScheduled : undefined
              }
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <span
                  className="material-symbols-outlined text-6xl opacity-50 block mb-4"
                  aria-hidden
                >
                  mail_outline
                </span>
                <p className="text-lg font-medium mb-2">No thread selected</p>
                <p className="text-sm">
                  Select a thread from the list to view conversation
                </p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </section>
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="flex flex-1 min-h-0 overflow-hidden isolate min-w-0">
          {threePane}
        </div>
        {showComposer && selectedThread && threadDetails && (
          <ReplyComposer
            thread={threadDetails}
            mode={composerMode}
            onClose={handleComposerClose}
            onSend={handleComposerSend}
            mailbox={selectedThread.mailbox}
          />
        )}
        {showComposeModal && (
          <ComposeEmailModal
            onClose={() => {
              setShowComposeModal(false);
              setInitialDraftData(null);
            }}
            onSent={async (deletedDraftId) => {
              if (deletedDraftId) {
                try {
                  await fetch(`/api/emails/drafts/${deletedDraftId}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                } catch {
                  /* ignore */
                }
                setThreads((t) =>
                  t.filter((x) => x.id !== `draft-${deletedDraftId}`)
                );
                setFolderCounts((prev) => ({
                  ...prev,
                  drafts: Math.max(0, (prev.drafts ?? 0) - 1),
                }));
                if (selectedThread?.id === `draft-${deletedDraftId}`) {
                  setSelectedThread(null);
                  setThreadDetails(null);
                }
              }
              setShowComposeModal(false);
              setInitialDraftData(null);
              fetchThreads();
              fetchCounts();
              if (selectedThread && !deletedDraftId)
                fetchThreadDetails(selectedThread.id);
            }}
            defaultMailboxId={selectedMailboxId}
            initialDraft={initialDraftData}
          />
        )}
      </>
    );
  }

  return (
    <div className="unibox-page unibox-mesh min-h-screen text-slate-800 dark:text-slate-200 font-display p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden">
      {/* Elite header */}
      <header className="w-full max-w-[1760px] flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-unibox-primary text-white flex items-center justify-center">
            <span className="material-icons-round text-lg" aria-hidden>
              check_circle
            </span>
          </div>
          <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">
            NextDeal
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-full border border-white/40 dark:border-slate-700/40 backdrop-blur-sm">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Apps"
          >
            <span className="material-icons-round text-base" aria-hidden>
              grid_view
            </span>
            Apps
          </Link>
          <Link
            href="/dashboard/crm/calendar"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Calendar"
          >
            <span className="material-icons-round text-base" aria-hidden>
              calendar_today
            </span>
            Calendar
          </Link>
          <Link
            href="/dashboard/crm/deals"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Deals"
          >
            <span className="material-icons-round text-base" aria-hidden>
              handshake
            </span>
            Deals
          </Link>
          <span
            className="px-4 py-2 text-sm font-bold text-unibox-primary bg-white dark:bg-slate-700 shadow-sm rounded-full transition-all flex items-center gap-2"
            aria-current="page"
          >
            <span className="material-icons-round text-base" aria-hidden>
              inbox
            </span>
            Unibox
          </span>
        </nav>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 flex items-center justify-center font-bold text-xs"
            aria-hidden
          >
            T
          </div>
        </div>
      </header>

      {/* Main glass panel */}
      <main className="w-full max-w-[1760px] h-[85vh] unibox-glass-panel rounded-3xl shadow-unibox-glass flex overflow-hidden relative">
        {threePane}
      </main>

      {showComposer && selectedThread && threadDetails && (
        <ReplyComposer
          thread={threadDetails}
          mode={composerMode}
          onClose={handleComposerClose}
          onSend={handleComposerSend}
          mailbox={selectedThread.mailbox}
        />
      )}
      {showComposeModal && (
        <ComposeEmailModal
          onClose={() => {
            setShowComposeModal(false);
            setInitialDraftData(null);
          }}
          onSent={async (deletedDraftId) => {
            if (deletedDraftId) {
              try {
                await fetch(`/api/emails/drafts/${deletedDraftId}`, {
                  method: "DELETE",
                  credentials: "include",
                });
              } catch {
                /* ignore */
              }
              setThreads((t) =>
                t.filter((x) => x.id !== `draft-${deletedDraftId}`)
              );
              setFolderCounts((prev) => ({
                ...prev,
                drafts: Math.max(0, (prev.drafts ?? 0) - 1),
              }));
              if (selectedThread?.id === `draft-${deletedDraftId}`) {
                setSelectedThread(null);
                setThreadDetails(null);
              }
            }
            setShowComposeModal(false);
            setInitialDraftData(null);
            fetchThreads();
            fetchCounts();
            if (selectedThread && !deletedDraftId)
              fetchThreadDetails(selectedThread.id);
          }}
          defaultMailboxId={selectedMailboxId}
          initialDraft={initialDraftData}
        />
      )}
    </div>
  );
}
