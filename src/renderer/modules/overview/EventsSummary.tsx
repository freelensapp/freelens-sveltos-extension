/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";

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
    <div className="overview-section">
      <h2>
        <Component.Icon material="event" />
        Recent Events ({events.totalEvents})
      </h2>

      {events.recentEvents.length === 0 ? (
        <div className="no-data">
          <Component.Icon material="info" />
          <p>No events to display</p>
        </div>
      ) : (
        <div className="events-list">
          {events.recentEvents.map((event, idx) => (
            <div key={idx} className="event-item">
              <div className="event-header">
                <span className="event-name">{event.name}</span>
                <span className="event-namespace">{event.namespace}</span>
                <span className="event-type">{event.type}</span>
              </div>
              <div className="event-body">
                <p>{event.message}</p>
                <span className="event-time">{formatTime(event.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
