import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle2, Circle, Loader2, XCircle, AlertTriangle, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Project, Deployment, getDeploymentsByProject } from '../lib/storage';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface ProductionStepperProps {
  project: Project;
  onStartDeployment: () => void;
  onCreateRelease: () => void;
  deployments: Deployment[];
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'warning';

interface Step {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  actionLabel?: string;
  onAction?: () => void;
  canSkip?: boolean;
}

export function ProductionStepper({ project, onStartDeployment, onCreateRelease, deployments }: ProductionStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Calculate step statuses based on current state
    const newSteps = calculateSteps();
    setSteps(newSteps);
    
    // Update current step based on progress
    const firstIncompleteStep = newSteps.findIndex(s => s.status === 'pending' || s.status === 'in_progress' || s.status === 'warning');
    if (firstIncompleteStep >= 0) {
      setCurrentStep(firstIncompleteStep);
    } else if (newSteps.every(s => s.status === 'completed')) {
      setCurrentStep(newSteps.length - 1);
    }
  }, [project, deployments]);

  const calculateSteps = (): Step[] => {
    // Step 1: Pre-deployment validation
    const hasRepositories = project.repositories.length > 0;
    const hasPipelines = project.pipelines.length > 0;
    const allPipelinesConfigured = project.pipelines.every(p => 
      p.name && p.workflowFile && p.branch && p.repositoryId
    );
    
    let preDeploymentStatus: StepStatus = 'pending';
    if (hasRepositories && hasPipelines && allPipelinesConfigured) {
      preDeploymentStatus = 'completed';
    } else if (hasRepositories || hasPipelines) {
      preDeploymentStatus = 'warning';
    }

    // Step 2: Deployment execution
    const recentDeployments = deployments.filter(d => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      return d.startedAt > oneHourAgo;
    });
    
    const hasRecentDeployments = recentDeployments.length > 0;
    const allDeploymentsCompleted = recentDeployments.length > 0 && 
      recentDeployments.every(d => d.status === 'success' || d.status === 'failure');
    const anyDeploymentInProgress = recentDeployments.some(d => 
      d.status === 'in_progress' || d.status === 'pending'
    );
    const anyDeploymentFailed = recentDeployments.some(d => d.status === 'failure');
    
    let deploymentStatus: StepStatus = 'pending';
    if (anyDeploymentInProgress) {
      deploymentStatus = 'in_progress';
    } else if (allDeploymentsCompleted) {
      if (anyDeploymentFailed) {
        deploymentStatus = 'failed';
      } else {
        deploymentStatus = 'completed';
      }
    } else if (hasRecentDeployments) {
      deploymentStatus = 'in_progress';
    }

    // Step 3: Deployment verification
    const allPipelinesDeployed = project.pipelines.length > 0 && 
      project.pipelines.every(p => 
        recentDeployments.some(d => d.pipelineId === p.id)
      );
    const allDeploymentsSuccessful = allPipelinesDeployed && 
      recentDeployments.every(d => d.status === 'success');
    
    let verificationStatus: StepStatus = 'pending';
    if (deploymentStatus === 'in_progress' || deploymentStatus === 'pending') {
      verificationStatus = 'pending';
    } else if (allDeploymentsSuccessful) {
      verificationStatus = 'completed';
    } else if (anyDeploymentFailed) {
      verificationStatus = 'failed';
    } else if (allDeploymentsCompleted && !allPipelinesDeployed) {
      verificationStatus = 'warning';
    }

    // Step 4: Release creation
    // This is manual, user needs to trigger it
    let releaseStatus: StepStatus = 'pending';
    if (verificationStatus === 'completed') {
      // User can now create release
      releaseStatus = 'pending';
    }

    // Step 5: Post-deployment validation
    let postDeploymentStatus: StepStatus = 'pending';

    return [
      {
        id: 'pre-deployment',
        title: 'Pre-deployment Checks',
        description: 'Validate project configuration and readiness',
        status: preDeploymentStatus,
        actionLabel: preDeploymentStatus === 'warning' ? 'Review Configuration' : undefined,
      },
      {
        id: 'deployment',
        title: 'Run Deployments',
        description: `Deploy to all ${project.pipelines.length} pipeline(s)`,
        status: deploymentStatus,
        actionLabel: deploymentStatus === 'pending' && preDeploymentStatus === 'completed' ? 'Start Deployment' : 
                     deploymentStatus === 'failed' ? 'Retry Deployment' : undefined,
        onAction: deploymentStatus === 'pending' || deploymentStatus === 'failed' ? onStartDeployment : undefined,
      },
      {
        id: 'verification',
        title: 'Verify Deployments',
        description: 'Ensure all deployments completed successfully',
        status: verificationStatus,
        actionLabel: verificationStatus === 'failed' ? 'View Failures' : undefined,
      },
      {
        id: 'release',
        title: 'Create GitHub Releases',
        description: 'Generate releases with release notes',
        status: releaseStatus,
        actionLabel: verificationStatus === 'completed' ? 'Create Releases' : undefined,
        onAction: verificationStatus === 'completed' ? onCreateRelease : undefined,
      },
      {
        id: 'post-deployment',
        title: 'Post-deployment Validation',
        description: 'Final checks and sign-off',
        status: postDeploymentStatus,
        canSkip: true,
      },
    ];
  };

  const getStepIcon = (step: Step, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="w-6 h-6" style={{ color: '#10b981' }} />;
    } else if (step.status === 'failed') {
      return <XCircle className="w-6 h-6" style={{ color: '#ef4444' }} />;
    } else if (step.status === 'in_progress') {
      return <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7c3aed' }} />;
    } else if (step.status === 'warning') {
      return <AlertTriangle className="w-6 h-6" style={{ color: '#f59e0b' }} />;
    } else {
      return (
        <Circle 
          className="w-6 h-6" 
          style={{ color: index === currentStep ? '#7c3aed' : '#d1d5db' }} 
        />
      );
    }
  };

  const getStepBadge = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="text-white" style={{ background: '#10b981' }}>Completed</Badge>;
      case 'failed':
        return <Badge className="text-white" style={{ background: '#ef4444' }}>Failed</Badge>;
      case 'in_progress':
        return <Badge className="text-white" style={{ background: '#7c3aed' }}>In Progress</Badge>;
      case 'warning':
        return <Badge className="text-white" style={{ background: '#f59e0b' }}>Warning</Badge>;
      default:
        return <Badge variant="outline" style={{ borderColor: '#d1d5db', color: '#6b7280' }}>Pending</Badge>;
    }
  };

  const calculateProgress = () => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2" style={{ background: 'linear-gradient(to right, #faf5ff, #fce7f3)', borderColor: '#e9d5ff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <CardTitle style={{ color: '#6b21a8' }}>
                    Production Release Process
                  </CardTitle>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5" style={{ color: '#7c3aed' }} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{ color: '#7c3aed' }} />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <Badge className="text-white px-4 py-1" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}>
              PRODUCTION
            </Badge>
          </div>
          
          {!isOpen && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-1.5">
                  {getStepIcon(step, index)}
                  <span className="text-xs" style={{ color: '#7c3aed' }}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-3 h-3 mx-1" style={{ color: '#d1d5db' }} />
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs" style={{ color: '#7c3aed' }}>
              <span>{steps.filter(s => s.status === 'completed').length} of {steps.length} steps completed</span>
              <span>{Math.round(calculateProgress())}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id}>
                <div 
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-purple-300 ${
                    index === currentStep ? 'border-purple-400 bg-white shadow-md' : 'border-purple-200 bg-white/50'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step, index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold truncate" style={{ color: '#6b21a8' }}>
                        {index + 1}. {step.title}
                      </h4>
                      {getStepBadge(step.status)}
                    </div>
                    <p className="text-sm" style={{ color: '#7c3aed' }}>
                      {step.description}
                    </p>
                    
                    {step.actionLabel && step.onAction && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          step.onAction?.();
                        }}
                        className="mt-3 text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
                      >
                        {step.actionLabel}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="flex justify-center">
                    <div 
                      className="w-0.5 h-4" 
                      style={{ 
                        background: step.status === 'completed' ? '#10b981' : '#e9d5ff' 
                      }} 
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
