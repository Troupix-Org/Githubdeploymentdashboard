import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Trash2,
  ExternalLink,
  GitBranch,
  Star,
} from 'lucide-react';
import { 
  Project, 
  Deployment, 
  getDeploymentsByProject, 
  deleteDeployment, 
  deleteDeploymentsByBatch,
  saveDeployment 
} from '../lib/storage';
import { getWorkflowRun } from '../lib/github';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface DeploymentStatusSectionProps {
  project: Project;
  deployments: Deployment[];
  releaseId?: string; // Filter deployments by production release ID
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  onDeploymentsUpdated?: () => void;
}

export function DeploymentStatusSection({ 
  project, 
  deployments: propDeployments,
  releaseId,
  isOpen = true, 
  onToggle,
  onDeploymentsUpdated 
}: DeploymentStatusSectionProps) {
  const [open, setOpen] = useState(isOpen);
  const [deployments, setDeployments] = useState<Deployment[]>(propDeployments);
  const [refreshing, setRefreshing] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBatchDialogOpen, setDeleteBatchDialogOpen] = useState(false);
  const [deploymentToDelete, setDeploymentToDelete] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    // Filter deployments by releaseId if provided
    const filtered = releaseId 
      ? propDeployments.filter(d => d.productionReleaseId === releaseId)
      : propDeployments;
    setDeployments(filtered);
  }, [propDeployments, releaseId]);

  // Auto-refresh when there are active deployments
  useEffect(() => {
    const hasActiveDeployments = deployments.some(
      d => d.status === 'pending' || d.status === 'in_progress'
    );

    if (!hasActiveDeployments) {
      setNextRefreshIn(0);
      return;
    }

    const getPollingInterval = () => {
      const activeDeployments = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress');
      if (activeDeployments.length === 0) return 15000;

      const oldestActiveDeployment = activeDeployments.reduce((oldest, current) => 
        current.startedAt < oldest.startedAt ? current : oldest
      );

      const age = Date.now() - oldestActiveDeployment.startedAt;
      const ageMinutes = age / 60000;

      if (ageMinutes < 2) return 10000;
      if (ageMinutes < 5) return 20000;
      return 30000;
    };

    const pollingInterval = getPollingInterval();
    setNextRefreshIn(pollingInterval);

    const countdownInterval = setInterval(() => {
      setNextRefreshIn(prev => Math.max(0, prev - 1000));
    }, 1000);

    const refreshInterval = setInterval(() => {
      refreshDeploymentStatus(true);
      setNextRefreshIn(pollingInterval);
    }, pollingInterval);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [deployments]);

  const refreshDeploymentStatus = async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    
    try {
      const currentDeployments = getDeploymentsByProject(project.id);
      const filtered = releaseId 
        ? currentDeployments.filter(d => d.productionReleaseId === releaseId)
        : currentDeployments;
      
      const updatedDeployments = [...filtered];
      let hasUpdates = false;

      for (let i = 0; i < updatedDeployments.length; i++) {
        const deployment = updatedDeployments[i];
        
        if (deployment.status === 'success' || deployment.status === 'failure') {
          continue;
        }

        if (!deployment.workflowRunId) {
          continue;
        }

        const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
        if (!pipeline) continue;

        const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
        if (!repository) continue;

        try {
          const run = await getWorkflowRun(repository.owner, repository.repo, deployment.workflowRunId);
          
          let status: Deployment['status'] = 'pending';
          if (run.status === 'completed') {
            status = run.conclusion === 'success' ? 'success' : 'failure';
          } else if (run.status === 'in_progress') {
            status = 'in_progress';
          } else if (run.status === 'queued') {
            status = 'pending';
          }

          if (status !== deployment.status) {
            hasUpdates = true;
            updatedDeployments[i] = {
              ...deployment,
              status,
              completedAt: run.status === 'completed' ? new Date(run.updated_at).getTime() : undefined,
            };
            // Save the updated deployment to storage
            saveDeployment(updatedDeployments[i]);
          }
        } catch (err) {
          console.error(`Failed to refresh status for deployment ${deployment.id}:`, err);
        }
      }

      if (hasUpdates) {
        setDeployments(updatedDeployments);
        onDeploymentsUpdated?.();
      }
    } catch (err) {
      console.error('Failed to refresh deployment status:', err);
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  };

  const handleDeleteDeployment = () => {
    if (deploymentToDelete) {
      deleteDeployment(deploymentToDelete);
      setDeployments(prev => prev.filter(d => d.id !== deploymentToDelete));
      setDeleteDialogOpen(false);
      setDeploymentToDelete(null);
      onDeploymentsUpdated?.();
    }
  };

  const handleDeleteBatch = () => {
    if (batchToDelete) {
      deleteDeploymentsByBatch(batchToDelete);
      setDeployments(prev => prev.filter(d => d.batchId !== batchToDelete));
      setDeleteBatchDialogOpen(false);
      setBatchToDelete(null);
      onDeploymentsUpdated?.();
    }
  };

  const handleToggle = (newState: boolean) => {
    setOpen(newState);
    onToggle?.(newState);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'failure':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#2563eb' }} />;
      default:
        return <Clock className="w-4 h-4" style={{ color: '#9ca3af' }} />;
    }
  };

  const getStatusBadge = (status: Deployment['status']) => {
    const styles = {
      success: { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
      failure: { background: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' },
      in_progress: { background: '#dbeafe', color: '#1e40af', border: '1px solid #2563eb' },
      pending: { background: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' },
    };

    return (
      <Badge variant="outline" style={styles[status]} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getEnvironmentBadgeStyle = (environment?: string) => {
    if (!environment) return { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' };
    
    const envLower = environment.toLowerCase();
    if (envLower.includes('prod')) {
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' };
    } else if (envLower.includes('staging') || envLower.includes('stg')) {
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' };
    } else if (envLower.includes('qa') || envLower.includes('test')) {
      return { background: '#dbeafe', color: '#1e40af', border: '1px solid #3b82f6' };
    } else if (envLower.includes('dev')) {
      return { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' };
    }
    return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #c4b5fd' };
  };

  // Group deployments by batchId
  const groupedDeployments = deployments.reduce((groups, deployment) => {
    const batchId = deployment.batchId || 'unknown';
    if (!groups[batchId]) {
      groups[batchId] = [];
    }
    groups[batchId].push(deployment);
    return groups;
  }, {} as Record<string, Deployment[]>);

  // Sort batch groups by most recent first
  const sortedBatchIds = Object.keys(groupedDeployments).sort((a, b) => {
    const aTime = Math.min(...groupedDeployments[a].map(d => d.startedAt));
    const bTime = Math.min(...groupedDeployments[b].map(d => d.startedAt));
    return bTime - aTime;
  });

  const activeCount = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress').length;

  return (
    <>
      <Collapsible open={open} onOpenChange={handleToggle}>
        <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5" style={{ color: '#7c3aed' }} />
                      <CardTitle style={{ color: '#6b21a8' }}>Deployment Status</CardTitle>
                      {open ? <ChevronUp className="w-4 h-4" style={{ color: '#7c3aed' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#7c3aed' }} />}
                      {deployments.length > 0 && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 text-xs px-2 py-0.5" 
                          style={{ 
                            background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', 
                            color: '#6b21a8', 
                            border: '2px solid #a78bfa' 
                          }}
                        >
                          {deployments.length}
                        </Badge>
                      )}
                      {activeCount > 0 && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 text-xs px-2 py-0.5 flex items-center gap-1" 
                          style={{ 
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                            color: '#1e40af', 
                            border: '2px solid #60a5fa' 
                          }}
                          title={`${activeCount} active deployment${activeCount > 1 ? 's' : ''} • Next refresh in ${Math.ceil(nextRefreshIn / 1000)} seconds`}
                        >
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>{activeCount} active • {Math.ceil(nextRefreshIn / 1000)}s</span>
                        </Badge>
                      )}
                    </div>
                    <CardDescription style={{ color: '#7c3aed' }}>
                      {(() => {
                        const activeDeployments = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress');
                        if (activeDeployments.length === 0) {
                          return 'Deployments grouped by session - each trigger creates a new batch';
                        }
                        
                        const oldestActive = activeDeployments.reduce((oldest, current) => 
                          current.startedAt < oldest.startedAt ? current : oldest
                        );
                        const ageMinutes = (Date.now() - oldestActive.startedAt) / 60000;
                        const interval = ageMinutes < 2 ? '10s' : ageMinutes < 5 ? '20s' : '30s';
                        
                        return `Auto-refreshing every ${interval} • ${activeDeployments.length} active deployment${activeDeployments.length > 1 ? 's' : ''}`;
                      })()}
                    </CardDescription>
                  </div>
                </Button>
              </CollapsibleTrigger>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshDeploymentStatus()}
                disabled={refreshing}
                className="border-2 hover:bg-purple-50"
                style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {deployments.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#9ca3af' }}>
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No deployments yet</p>
                  <p className="text-sm mt-1">Deploy a pipeline to see the status here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedBatchIds.map((batchId, batchIndex) => {
                    const batch = groupedDeployments[batchId];
                    const batchStartTime = Math.min(...batch.map(d => d.startedAt));
                    const batchHasGlobalRelease = batch.some(d => d.globalReleaseNumber);
                    const globalReleaseNumber = batch.find(d => d.globalReleaseNumber)?.globalReleaseNumber;

                    return (
                      <div key={batchId} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: '#e9d5ff' }}>
                        {/* Batch Header */}
                        <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)', borderBottom: '2px solid #e9d5ff' }}>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className="text-xs font-mono" 
                              style={{ 
                                background: '#6b21a8', 
                                color: '#ffffff', 
                                border: 'none' 
                              }}
                            >
                              #{sortedBatchIds.length - batchIndex}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" style={{ color: '#7c3aed' }} />
                              <span className="text-sm font-semibold" style={{ color: '#6b21a8' }}>
                                {formatDate(batchStartTime)}
                              </span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className="text-xs" 
                              style={{ 
                                background: '#ffffff', 
                                color: '#7c3aed', 
                                border: '1px solid #c4b5fd' 
                              }}
                            >
                              {batch.length} pipeline{batch.length !== 1 ? 's' : ''}
                            </Badge>
                            {batchHasGlobalRelease && (
                              <Badge 
                                variant="outline" 
                                className="text-xs flex items-center gap-1" 
                                style={{ 
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                                  color: '#92400e', 
                                  border: '1px solid #f59e0b' 
                                }}
                              >
                                <Star className="w-3 h-3" />
                                Release {globalReleaseNumber}
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setBatchToDelete(batchId);
                              setDeleteBatchDialogOpen(true);
                            }}
                            className="hover:bg-red-50 h-7"
                            title="Delete this batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                          </Button>
                        </div>

                        {/* Batch Deployments Table */}
                        <Table>
                          <TableHeader>
                            <TableRow style={{ background: '#fafafa', borderColor: '#f3e8ff' }}>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Status</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Pipeline</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Environment</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Build</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Repository</TableHead>
                              <TableHead className="font-semibold text-xs text-right" style={{ color: '#6b21a8' }}>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batch.map((deployment) => {
                              const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
                              const repo = project.repositories.find(r => r.id === deployment.repositoryId);
                              
                              return (
                                <TableRow 
                                  key={deployment.id}
                                  className="hover:bg-purple-50/30"
                                  style={{ borderColor: '#f3e8ff' }}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(deployment.status)}
                                      {getStatusBadge(deployment.status)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs" 
                                        style={{ color: '#7c3aed', background: '#fefcff', borderColor: '#c4b5fd' }}
                                      >
                                        {pipeline?.name || 'Unknown'}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {deployment.environment || pipeline?.environment ? (
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs font-mono" 
                                        style={getEnvironmentBadgeStyle(deployment.environment || pipeline?.environment)}
                                      >
                                        {deployment.environment || pipeline?.environment}
                                      </Badge>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <GitBranch className="w-3 h-3" style={{ color: '#9ca3af' }} />
                                        <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>
                                          {deployment.branch}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-mono text-sm" style={{ color: '#6b21a8' }}>
                                      {deployment.buildNumber}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm" style={{ color: '#7c3aed' }}>
                                      {repo?.name || 'Unknown'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {deployment.workflowRunId && repo && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            window.open(
                                              `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${deployment.workflowRunId}`,
                                              '_blank'
                                            );
                                          }}
                                          className="hover:bg-purple-100 h-7 w-7 p-0"
                                          title="View on GitHub"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setDeploymentToDelete(deployment.id);
                                          setDeleteDialogOpen(true);
                                        }}
                                        className="hover:bg-red-50 h-7 w-7 p-0"
                                        title="Delete deployment"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete Deployment Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent style={{ background: '#1e293b', borderColor: '#475569' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#e9d5ff' }}>Delete Deployment?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#cbd5e1' }}>
              This will permanently delete this deployment record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeployment}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Batch Dialog */}
      <AlertDialog open={deleteBatchDialogOpen} onOpenChange={setDeleteBatchDialogOpen}>
        <AlertDialogContent style={{ background: '#1e293b', borderColor: '#475569' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#e9d5ff' }}>Delete Entire Batch?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#cbd5e1' }}>
              This will permanently delete all deployments in this batch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteBatchDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
