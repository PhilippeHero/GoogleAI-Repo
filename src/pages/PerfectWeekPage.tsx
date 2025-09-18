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
    const [visibleSeries, setVisibleSeries] = useState({
        applications: true,
        interviews: true,
        newContacts: true,
    });
    
    const toggleSeries = (series: keyof typeof visibleSeries) => {
        setVisibleSeries(prev => ({...prev, [series]: !prev[series]}));
    };

    const chartData = data.slice().reverse(); // Show oldest on left

    const SVG_HEIGHT = 350;
    const margin = { top: 20, right: 20, bottom: 60, left: 40 };
    const height = SVG_HEIGHT - margin.top - margin.bottom;

    // Y-axis with interval of 1
    const trueMaxValue = Math.max(0, ...chartData.flatMap(d => [d.applicationCount, d.interviews, d.newContacts]));
    const maxValue = Math.max(5, Math.ceil(trueMaxValue)); // Min height of 5, and integer max
    const yAxisTicks = Array.from({ length: maxValue + 1 }, (_, i) => i);

    // Fixed bar width
    const singleBarWidth = 15;
    const groupWidth = singleBarWidth * 3;
    const groupPadding = 15;
    const totalGroupWidth = groupWidth + groupPadding;
    
    const width = chartData.length > 0 ? (chartData.length * totalGroupWidth) - groupPadding : 0; // No padding after last group
    const SVG_WIDTH = width + margin.left + margin.right;

    const colors = {
        applications: 'hsl(221, 100%, 19%)', // primary
        interviews: 'hsl(142, 76%, 36%)',   // success
        newContacts: 'hsl(221, 100%, 85%)', // primary light
    };
    
    type SeriesKey = keyof typeof colors;
    
    const legendItems: {key: SeriesKey, labelKey: keyof typeof translations['EN']}[] = [
        { key: 'applications', labelKey: 'applicationsColumn' },
        { key: 'interviews', labelKey: 'interviewsColumn' },
        { key: 'newContacts', labelKey: 'newContactsColumn' },
    ];

    return (
        <div style={{width: '100%', overflowX: 'auto'}}>
            <svg width={SVG_WIDTH} height={SVG_HEIGHT} aria-label={t('chartTitle')}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                    {/* Y-axis grid lines and labels */}
                    {yAxisTicks.map(tick => (
                        <g key={`y-tick-${tick}`} role="presentation">
                            <line
                                className="chart-grid-line"
                                x1="0"
                                x2={width}
                                y1={height - (tick / maxValue) * height}
                                y2={height - (tick / maxValue) * height}
                                style={{ display: tick === 0 ? 'none' : 'block' }}
                            />
                            <text x="-10" y={height - (tick / maxValue) * height + 4} textAnchor="end" className="chart-axis-label">
                                {tick}
                            </text>
                        </g>
                    ))}
                    <line className="chart-axis-line" x1="0" y1="0" x2="0" y2={height} role="presentation" />
                    <line className="chart-axis-line" x1="0" y1={height} x2={width} y2={height} role="presentation" />


                    {/* Bars */}
                    {chartData.map((d, i) => {
                        const x = i * totalGroupWidth;
                        const appHeight = d.applicationCount > 0 ? (d.applicationCount / maxValue) * height : 0;
                        const interviewHeight = d.interviews > 0 ? (d.interviews / maxValue) * height : 0;
                        const contactHeight = d.newContacts > 0 ? (d.newContacts / maxValue) * height : 0;
                        
                        let currentBarX = 0;
                        const visibleCount = (visibleSeries.applications ? 1:0) + (visibleSeries.interviews ? 1:0) + (visibleSeries.newContacts ? 1:0);
                        const currentGroupWidth = visibleCount * singleBarWidth;
                        
                        return (
                            <g key={d.yearWeek} transform={`translate(${x}, 0)`} role="group" aria-label={`Data for week ${d.yearWeek}`}>
                                {visibleSeries.applications && (
                                    <rect
                                        x={currentBarX}
                                        y={height - appHeight}
                                        width={singleBarWidth}
                                        height={appHeight}
                                        fill={colors.applications}
                                        aria-label={`${d.applicationCount} ${t('applicationsColumn')}`}
                                    />
                                )}
                                {visibleSeries.applications && (currentBarX += singleBarWidth)}

                                {visibleSeries.interviews && (
                                    <rect
                                        x={currentBarX}
                                        y={height - interviewHeight}
                                        width={singleBarWidth}
                                        height={interviewHeight}
                                        fill={colors.interviews}
                                        aria-label={`${d.interviews} ${t('interviewsColumn')}`}
                                    />
                                )}
                                {visibleSeries.interviews && (currentBarX += singleBarWidth)}

                                {visibleSeries.newContacts && (
                                    <rect
                                        x={currentBarX}
                                        y={height - contactHeight}
                                        width={singleBarWidth}
                                        height={contactHeight}
                                        fill={colors.newContacts}
                                        aria-label={`${d.newContacts} ${t('newContactsColumn')}`}
                                    />
                                )}
                                <text
                                    x={currentGroupWidth / 2}
                                    y={height + 20}
                                    textAnchor="middle"
                                    className="chart-axis-label"
                                >
                                    {d.yearWeek.substring(5)}
                                </text>
                                <text
                                    x={currentGroupWidth / 2}
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
            <div className="chart-legend" role="group" aria-label="Chart Legend">
               {legendItems.map(item => (
                    <div 
                        key={item.key}
                        className="chart-legend-item" 
                        style={{ cursor: 'pointer', opacity: visibleSeries[item.key] ? 1 : 0.5, textDecoration: visibleSeries[item.key] ? 'none' : 'line-through' }}
                        onClick={() => toggleSeries(item.key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSeries(item.key); }}
                        aria-pressed={visibleSeries[item.key]}
                    >
                        <span className="chart-legend-color" style={{backgroundColor: colors[item.key]}}></span>
                        {t(item.labelKey)}
                    </div>
                ))}
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
    const [chartPage, setChartPage] = useState(0);
    const WEEKS_PER_PAGE = 12;

    const [newYear, setNewYear] = useState<string>(String(new Date().getFullYear()));
    const [newWeek, setNewWeek] = useState<string>('');
    const [addWeekError, setAddWeekError] = useState('');


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

                    const existing = weeklyDataMap.get(yearWeek);
                    if (!existing) {
                        weeklyDataMap.set(yearWeek, {
                            user_id: user.id,
                            year,
                            weekNumber,
                            yearWeek,
                            applicationCount: 1,
                            interviews: 0,
                            newContacts: 0,
                        });
                    } else {
                        weeklyDataMap.set(yearWeek, {
                            ...existing,
                            applicationCount: existing.applicationCount + 1,
                        });
                    }
                } catch (e) {
                    console.error("Invalid application date:", job.applicationDate);
                }
            }
        });

        // Step 2: Merge in saved stats from DB
        weeklyStats.forEach(stat => {
            const yearWeek = `${stat.year}-${String(stat.weekNumber).padStart(2, '0')}`;
            const existing = weeklyDataMap.get(yearWeek);
            if (!existing) {
                weeklyDataMap.set(yearWeek, {
                    ...stat,
                    yearWeek,
                    applicationCount: 0, // No jobs found for this week, so count is 0
                });
            } else {
                weeklyDataMap.set(yearWeek, {
                    ...existing,
                    id: stat.id,
                    interviews: stat.interviews,
                    newContacts: stat.newContacts,
                });
            }
        });
        
        // Step 3: Ensure the current week is always present for data entry
        const today = new Date();
        const [currentYear, currentWeekNumber] = getWeek(today);
        const currentYearWeek = `${currentYear}-${String(currentWeekNumber).padStart(2, '0')}`;

        if (!weeklyDataMap.has(currentYearWeek)) {
            weeklyDataMap.set(currentYearWeek, {
                user_id: user.id,
                year: currentYear,
                weekNumber: currentWeekNumber,
                yearWeek: currentYearWeek,
                applicationCount: 0,
                interviews: 0,
                newContacts: 0,
            });
        }

        return Array.from(weeklyDataMap.values()).sort((a, b) => b.yearWeek.localeCompare(a.yearWeek));
    }, [jobs, weeklyStats, user]);

    const pagedData = useMemo(() => {
        const startIndex = chartPage * WEEKS_PER_PAGE;
        const endIndex = startIndex + WEEKS_PER_PAGE;
        return mergedData.slice(startIndex, endIndex);
    }, [mergedData, chartPage]);

    const totalPages = Math.ceil(mergedData.length / WEEKS_PER_PAGE);
    const handleNextPage = () => setChartPage(p => Math.min(p + 1, totalPages - 1)); // Older
    const handlePrevPage = () => setChartPage(p => Math.max(p - 1, 0)); // Newer

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
    
    const handleAddNewWeek = () => {
        if (!user) return;
        setAddWeekError('');
        const year = parseInt(newYear, 10);
        const weekNumber = parseInt(newWeek, 10);
    
        if (isNaN(year) || year < 2000 || year > 2100) {
            setAddWeekError('Please enter a valid year.');
            return;
        }
        if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
            setAddWeekError('Please enter a valid week number (1-53).');
            return;
        }
    
        const yearWeek = `${year}-${String(weekNumber).padStart(2, '0')}`;
        const exists = mergedData.some(d => d.yearWeek === yearWeek);
        if (exists) {
            setAddWeekError('This week already exists in the table.');
            return;
        }
    
        onSaveStat({
            user_id: user.id,
            year: year,
            weekNumber: weekNumber,
            interviews: 0,
            newContacts: 0,
        });
    
        setNewWeek('');
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
                <div className="card-header-wrapper">
                    <h3 className="card-header">{t('chartTitle')}</h3>
                    <div className="card-header-actions">
                        <Button onClick={handlePrevPage} disabled={chartPage === 0} className="btn-sm">
                            &larr; Newer
                        </Button>
                        <Button onClick={handleNextPage} disabled={chartPage >= totalPages - 1} className="btn-sm">
                            Older &rarr;
                        </Button>
                    </div>
                </div>
                <WeeklyChart data={pagedData} t={t} />
            </Card>

            <Card>
                <h3 className="card-header">Add New Week</h3>
                <div className="add-job-controls">
                    <input 
                        type="number" 
                        value={newYear}
                        onChange={e => setNewYear(e.target.value)}
                        placeholder="Year (e.g., 2024)"
                        className="input"
                    />
                    <input 
                        type="number" 
                        value={newWeek}
                        onChange={e => setNewWeek(e.target.value)}
                        placeholder="Week (1-53)"
                        className="input"
                    />
                    <Button onClick={handleAddNewWeek}>
                        Add Week
                    </Button>
                </div>
                {addWeekError && <p className="error-inline">{addWeekError}</p>}
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
                                                aria-label={`Interviews for week ${stat.yearWeek}`}
                                            />
                                        </td>
                                        <td className="input-cell">
                                            <input
                                                type="number"
                                                className="input"
                                                value={newContactsValue}
                                                onChange={(e) => handleEditChange(stat.yearWeek, 'newContacts', e.target.value)}
                                                min="0"
                                                aria-label={`New contacts for week ${stat.yearWeek}`}
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
