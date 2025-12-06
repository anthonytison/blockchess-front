"use client";

import { useEffect, useRef } from "react";

interface ScreenReaderAnnouncementsProps {
  announcements: string[];
}

export function ScreenReaderAnnouncements({ announcements }: ScreenReaderAnnouncementsProps) {
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcements.length > 0 && announcementRef.current) {
      // Clear previous announcements
      announcementRef.current.textContent = "";
      // Add new announcement
      const latestAnnouncement = announcements[announcements.length - 1];
      announcementRef.current.textContent = latestAnnouncement;
    }
  }, [announcements]);

  return (
    <div
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

