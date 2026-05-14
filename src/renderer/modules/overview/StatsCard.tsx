/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";
import styles from "./Overview.module.scss";

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
  const colorClassByName: Record<string, string> = {
    blue: styles.statsCardBlue,
    purple: styles.statsCardPurple,
    green: styles.statsCardGreen,
    orange: styles.statsCardOrange,
  };
  const colorClass = colorClassByName[color] ?? styles.statsCardBlue;

  return (
    <div className={`${styles.statsCard} ${colorClass}`}>
      <div className={styles.statsCardHeader}>
        <Component.Icon material={icon} />
        <h3>{title}</h3>
      </div>
      <div className={styles.statsCardContent}>
        <div className={styles.statsCardMain}>
          <span className={styles.statsValue}>{value}</span>
        </div>
        {subValue !== undefined && subLabel && (
          <div className={styles.statsCardSub}>
            <span className={styles.statsSubLabel}>{subLabel}</span>
            <span className={styles.statsSubValue}>{subValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};
