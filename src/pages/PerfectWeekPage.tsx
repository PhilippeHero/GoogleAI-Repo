/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { translations } from '../../translations';
import { Job, WeeklyStat } from '../types';
import { Card, Button } from '../components/ui';

// Helper to get ISO 8601 week number
const getWeek = (date: Date): [number, number] => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
};

type ChartProps = {
    data: WeeklyStat[];
    t: (key: keyof typeof translations['EN']) => string;
};

const WeeklyChart: FC<ChartProps> = ({ data, t }) => {
    const chartData = data.slice(0, 12).reverse(); // Show last 12 weeks, oldest on left

    const SVG_WIDTH = '100%';
    const SVG_HEIGHT = 350;
    const margin = { top: 20, right: 20, bottom: 60, left: 40 };
    const width = 1160 - margin.left - margin.right; // Assuming max width of container
    const height = SVG_HEIGHT - margin.top - margin.bottom;

    const maxValue = Math.max(10, ...chartData.flatMap(d => [d.applicationCount, d.interviews, d.newContacts]));
    const yAxisTicks = Array.from({ length: 6 }, (_, i) => Math.round(i * maxValue / 5));

    const barWidth = width / chartData.length * 0.7;
    const groupPadding = width / chartData.length * 0.3;
    const singleBarWidth = barWidth / 3;

    const colors = {
        applications: 'hsl(221, 100%, 19%)', // primary
        interviews: 'hsl(142, 76%, 36%)',   // success
        newContacts: 'hsl(221, 100%, 85%)', // primary light
    };

    return (
        <div style={{width: '100%', overflowX: 'auto'}}>
            <svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${width + margin.left + margin.right} ${SVG_HEIGHT}`}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                    {/* Y-axis grid lines and labels */}
                    {yAxisTicks.map(tick => (
                        <g key={`y-tick-${tick}`}>
                            <line
                                className="chart-grid-line"
                                x1="0"
                                x2={width}
                                y1={height - (tick / maxValue) * height}
                                y2={height - (tick / maxValue) * height}
                            />
                            <text x="-10" y={height - (tick / maxValue) * height + 4} textAnchor="end" className="chart-axis-label">
                                {tick}
                            </text>
                        </g>
                    ))}
                    <line className="chart-axis-line" x1="0" y1="0" x2="0" y2={height} />

                    {/* Bars */}
                    {chartData.map((d, i) => {
                        const x = i * (barWidth + groupPadding);
                        const appHeight = (d.applicationCount / maxValue) * height;
                        const interviewHeight = (d.interviews / maxValue) * height;
                        const contactHeight = (d.newContacts / maxValue) * height;
                        
                        return (
                            <g key={d.yearWeek} transform={`translate(${x}, 0)`}>
                                <rect
                                    x="0"
                                    y={height - appHeight}
                                    width={singleBarWidth}
                                    height={appHeight}
                                    fill={colors.applications}
                                />
                                <rect
                                    x={singleBarWidth}
                                    y={height - interviewHeight}
                                    width={singleBarWidth}
                                    height={interviewHeight}
                                    fill={colors.interviews}
                                />
                                <rect
                                    x={singleBarWidth * 2}
                                    y={height - contactHeight}
                                    width={singleBarWidth}
                                    height={contactHeight}
                                    fill={colors.newContacts}
                                />
                                <text
                                    x={barWidth / 2}
                                    y={height + 20}
                                    textAnchor="middle"
                                    className="chart-axis-label"
                                >
                                    {d.yearWeek.substring(5)}
                                </text>
                                <text
                                    x={barWidth / 2}
                                    y={height + 35}
                                    textAnchor="middle"
                                    className="chart-axis-label"
                                >
                                    {d.year}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
            <div className="chart-legend">
                <div className="chart-legend-item">
                    <span className="chart-legend-color" style={{backgroundColor: colors.applications}}></span>
                    {t('applicationsColumn')}
                </div>
                <div className="chart-legend-item">
                    <span className="chart-legend-color" style={{backgroundColor: colors.interviews}}></span>
                    {t('interviewsColumn')}
                </div>
                 <div className="chart-legend-item">
                    <span className="chart-legend-color" style={{backgroundColor: colors.newContacts}}></span>
                    {t('newContactsColumn')}
                </div>
            </div>
        </div>
    );
};

type PerfectWeekPageProps = {
    t: (key: keyof typeof translations['EN']) => string;
    jobs: Job[];
    weeklyStats: WeeklyStat[];
    onSaveStat: (stat: Omit<WeeklyStat, 'applicationCount' | 'yearWeek'>) => void;
    user: User | null;
};

export const PerfectWeekPage: FC<PerfectWeekPageProps> = ({ t, jobs, weeklyStats, onSaveStat, user }) => {

    const [editedStats, setEditedStats] = useState<Record<string, { interviews?: number; newContacts?: number }>>({});

    const mergedData = useMemo(() => {
        if (!user) return [];

        const weeklyDataMap = new Map<string, WeeklyStat>();

        // Step 1: Aggregate application counts from jobs
        jobs.forEach(job => {
            if (job.applicationDate) {
                try {
                    const date = new Date(job.applicationDate);
                    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                    const correctDate = new Date(date.getTime() + userTimezoneOffset);
                    if (isNaN(correctDate.getTime())) return;

                    const [year, weekNumber] = getWeek(correctDate);
                    const yearWeek = `${year}-${String(weekNumber).padStart(2, '0')}`;

                    if (!weeklyDataMap.has(yearWeek)) {
                        weeklyDataMap.set(yearWeek, {
                            user_id: user.id,
                            year,
                            weekNumber,
                            yearWeek,
                            applicationCount: 0,
                            interviews: 0,
                            newContacts: 0,
                        });
                    }
                    weeklyDataMap.get(yearWeek)!.applicationCount++;
                } catch (e) {
                    console.error("Invalid application date:", job.applicationDate);
                }
            }
        });

        // Step 2: Merge in saved stats from DB
        weeklyStats.forEach(stat => {
            const yearWeek = `${stat.year}-${String(stat.weekNumber).padStart(2, '0')}`;
            if (!weeklyDataMap.has(yearWeek)) {
                weeklyDataMap.set(yearWeek, {
                    ...stat,
                    yearWeek,
                    applicationCount: 0,
                });
            } else {
                const existing = weeklyDataMap.get(yearWeek)!;
                existing.id = stat.id;
                existing.interviews = stat.interviews;
                existing.newContacts = stat.newContacts;
            }
        });

        return Array.from(weeklyDataMap.values()).sort((a, b) => b.yearWeek.localeCompare(a.yearWeek));
    }, [jobs, weeklyStats, user]);

    const handleEditChange = (yearWeek: string, field: 'interviews' | 'newContacts', value: string) => {
        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue) || numericValue < 0) return;

        const originalStat = mergedData.find(d => d.yearWeek === yearWeek);

        setEditedStats(prev => ({
            ...prev,
            [yearWeek]: {
                interviews: prev[yearWeek]?.interviews ?? originalStat?.interviews ?? 0,
                newContacts: prev[yearWeek]?.newContacts ?? originalStat?.newContacts ?? 0,
                [field]: numericValue
            }
        }));
    };

    const handleSave = (yearWeek: string) => {
        const originalStat = mergedData.find(d => d.yearWeek === yearWeek);
        const editedStat = editedStats[yearWeek];

        if (!originalStat || !editedStat) return;

        const statToSave = { ...originalStat, ...editedStat };
        const { applicationCount, yearWeek: yw, ...rest } = statToSave;
        
        onSaveStat(rest);

        setEditedStats(prev => {
            const newEdited = { ...prev };
            delete newEdited[yearWeek];
            return newEdited;
        });
    };

    return (
        <>
            <Card className="chart-card">
                <h3 className="card-header">{t('chartTitle')}</h3>
                <WeeklyChart data={mergedData} t={t} />
            </Card>
            <Card>
                <div className="table-responsive">
                    <table className="jobs-table editable-table">
                        <thead>
                            <tr>
                                <th>{t('weekNrColumn')}</th>
                                <th>{t('applicationsColumn')}</th>
                                <th>{t('interviewsColumn')}</th>
                                <th>{t('newContactsColumn')}</th>
                                <th className="save-cell">{t('jobColumnActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mergedData.map(stat => {
                                const isEdited = !!editedStats[stat.yearWeek];
                                const interviewsValue = editedStats[stat.yearWeek]?.interviews ?? stat.interviews;
                                const newContactsValue = editedStats[stat.yearWeek]?.newContacts ?? stat.newContacts;

                                return (
                                    <tr key={stat.yearWeek}>
                                        <td>{stat.yearWeek}</td>
                                        <td>{stat.applicationCount}</td>
                                        <td className="input-cell">
                                            <input
                                                type="number"
                                                className="input"
                                                value={interviewsValue}
                                                onChange={(e) => handleEditChange(stat.yearWeek, 'interviews', e.target.value)}
                                                min="0"
                                            />
                                        </td>
                                        <td className="input-cell">
                                            <input
                                                type="number"
                                                className="input"
                                                value={newContactsValue}
                                                onChange={(e) => handleEditChange(stat.yearWeek, 'newContacts', e.target.value)}
                                                min="0"
                                            />
                                        </td>
                                        <td className="save-cell">
                                            <Button
                                                onClick={() => handleSave(stat.yearWeek)}
                                                disabled={!isEdited}
                                                className="btn-sm"
                                            >
                                                {t('saveButton')}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};
