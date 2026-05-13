/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";

const { Component } = Renderer;

interface StatCardProps {
  title: string;
  value: number;
  subValue?: number;
  subLabel?: string;
  icon?: string;
  color?: string;
}

export const StatsCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  subLabel,
  icon = "info",
  color = "blue",
}) => {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-card-header">
        <Component.Icon material={icon} />
        <h3>{title}</h3>
      </div>
      <div className="stats-card-content">
        <div className="stats-card-main">
          <span className="stats-value">{value}</span>
        </div>
        {subValue !== undefined && subLabel && (
          <div className="stats-card-sub">
            <span className="stats-sub-label">{subLabel}</span>
            <span className="stats-sub-value">{subValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};
