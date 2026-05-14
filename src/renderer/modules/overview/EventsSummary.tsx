/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";
import styles from "./Overview.module.scss";

import type { EventStats } from "./types";

const { Component } = Renderer;

interface EventsSummaryProps {
  events: EventStats;
}

export const EventsSummary: React.FC<EventsSummaryProps> = ({ events }) => {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className={styles.overviewSection}>
      <h2>
        <Component.Icon material="event" />
        Recent Events ({events.totalEvents})
      </h2>

      {events.recentEvents.length === 0 ? (
        <div className={styles.noData}>
          <Component.Icon material="info" />
          <p>No events to display</p>
        </div>
      ) : (
        <div className={styles.eventsList}>
          {events.recentEvents.map((event, idx) => (
            <div key={idx} className={styles.eventItem}>
              <div className={styles.eventItemHeader}>
                <span className={styles.eventItemName}>{event.name}</span>
                <span className={styles.eventItemNamespace}>{event.namespace}</span>
                <span className={styles.eventItemType}>{event.type}</span>
              </div>
              <div className={styles.eventItemBody}>
                <p>{event.message}</p>
                <span className={styles.eventItemTime}>{formatTime(event.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
