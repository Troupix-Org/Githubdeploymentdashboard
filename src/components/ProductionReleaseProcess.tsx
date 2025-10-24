import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Mail,
  ClipboardCheck,
  UserCheck,
  Rocket,
  FileCheck,
  TestTube,
  GitBranch,
  Upload,
  Copy,
  ExternalLink,
  AlertCircle,
  Download,
} from 'lucide-react';
import { 
  Project, 
  Deployment, 
  Repository,
  ProductionRelease,
  getProductionReleasesByProject,
  saveProductionRelease,
  createProductionRelease,
  generateReleaseNumber,
} from '../lib/storage';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ReleaseCreator } from './ReleaseCreator';

interface ProductionReleaseProcessProps {
  project: Project;
  deployments: Deployment[];
  currentRelease?: ProductionRelease | null;
  onDeployToProduction: () => void;
  onCreateRelease?: (repository: Repository) => void;
  onReleaseUpdated?: () => void;
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

interface ProductionStep {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  icon: any;
  requiresAction: boolean;
}

interface EmailTemplate {
  to: string;
  subject: string;
  body: string;
}

interface QASignOff {
  testerName: string;
  testDate: string;
  testEnvironment: 'staging' | 'production';
  testsPassed: boolean;
  comments: string;
}

interface POSignOff {
  ownerName: string;
  approvalDate: string;
  comments: string;
}

interface ComplianceFile {
  fileName: string;
  fileContent: string; // Base64 or text content
  uploadDate: string;
}

export function ProductionReleaseProcess({ 
  project, 
  deployments,
  currentRelease: propCurrentRelease,
  onDeployToProduction,
  onCreateRelease,
  onReleaseUpdated 
}: ProductionReleaseProcessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  
  // Production Release Management - use prop if provided, otherwise manage internally
  const [currentRelease, setCurrentRelease] = useState<ProductionRelease | null>(propCurrentRelease || null);
  
  // Step 2: Email for staging ready
  const [stagingEmailDialog, setStagingEmailDialog] = useState(false);
  const [stagingEmailRecipients, setStagingEmailRecipients] = useState('');
  const [stagingEmailTemplate, setStagingEmailTemplate] = useState<EmailTemplate | null>(null);
  
  // Step 3: QA Sign-off
  const [qaSignOffDialog, setQaSignOffDialog] = useState(false);
  const [qaSignOff, setQaSignOff] = useState<QASignOff>({
    testerName: '',
    testDate: new Date().toISOString().split('T')[0],
    testEnvironment: 'staging',
    testsPassed: false,
    comments: '',
  });
  
  // Step 4: Email for production release
  const [prodEmailDialog, setProdEmailDialog] = useState(false);
  const [prodEmailRecipients, setProdEmailRecipients] = useState('');
  const [complianceFile, setComplianceFile] = useState<ComplianceFile | null>(null);
  
  // Step 5: PO Sign-off
  const [poSignOffDialog, setPoSignOffDialog] = useState(false);
  const [poSignOff, setPoSignOff] = useState<POSignOff>({
    ownerName: '',
    approvalDate: new Date().toISOString().split('T')[0],
    comments: '',
  });
  
  // Step 7: Email for production complete
  const [prodCompleteEmailDialog, setProdCompleteEmailDialog] = useState(false);
  
  // Step 8: GitHub release
  const [releaseDialog, setReleaseDialog] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  
  // Persistent storage keys
  const STORAGE_PREFIX = `prod_release_${project.id}_`;

  useEffect(() => {
    // If currentRelease is provided via props, use it
    if (propCurrentRelease) {
      setCurrentRelease(propCurrentRelease);
    }
    loadStoredData();
    updateSteps();
  }, [project, deployments, propCurrentRelease]);

  useEffect(() => {
    if (currentRelease) {
      loadReleaseData(currentRelease);
    }
    updateSteps();
  }, [currentRelease]);

  const loadReleaseData = (release: ProductionRelease) => {
    try {
      // Load data from the release object
      if (release.qaSignOff) setQaSignOff(release.qaSignOff);
      if (release.poSignOff) setPoSignOff(release.poSignOff);
      if (release.complianceFile) setComplianceFile(release.complianceFile);
      if (release.emailRecipients) {
        setStagingEmailRecipients(release.emailRecipients.staging || '');
        setProdEmailRecipients(release.emailRecipients.production || '');
      }
    } catch (err) {
      console.error('Failed to load release data:', err);
    }
  };

  const loadStoredData = () => {
    // This is now a fallback for legacy data - we'll migrate to release-based storage
    if (currentRelease) return; // Skip if we have a current release
    
    try {
      const storedQA = localStorage.getItem(`${STORAGE_PREFIX}qa_signoff`);
      if (storedQA) setQaSignOff(JSON.parse(storedQA));
      
      const storedPO = localStorage.getItem(`${STORAGE_PREFIX}po_signoff`);
      if (storedPO) setPoSignOff(JSON.parse(storedPO));
      
      const storedCompliance = localStorage.getItem(`${STORAGE_PREFIX}compliance_file`);
      if (storedCompliance) setComplianceFile(JSON.parse(storedCompliance));
      
      const storedRecipients = localStorage.getItem(`${STORAGE_PREFIX}email_recipients`);
      if (storedRecipients) {
        const recipients = JSON.parse(storedRecipients);
        setStagingEmailRecipients(recipients.staging || '');
        setProdEmailRecipients(recipients.production || '');
      }
    } catch (err) {
      console.error('Failed to load stored production release data:', err);
    }
  };

  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save to storage:', err);
    }
  };

  const handleCreateNewRelease = () => {
    const suggestedNumber = generateReleaseNumber(project.id);
    setNewReleaseNumber(suggestedNumber);
    setUseAutoNumber(true);
    setShowReleaseDialog(true);
  };

  const handleConfirmCreateRelease = () => {
    const releaseNumber = useAutoNumber ? newReleaseNumber : newReleaseNumber.trim();
    if (!releaseNumber) {
      alert('Please enter a release number');
      return;
    }

    // Check if release number already exists
    const exists = availableReleases.some(r => r.releaseNumber === releaseNumber);
    if (exists) {
      alert('A release with this number already exists');
      return;
    }

    const newRelease = createProductionRelease(project.id, releaseNumber);
    setCurrentRelease(newRelease);
    setAvailableReleases([newRelease, ...availableReleases]);
    localStorage.setItem(`${STORAGE_PREFIX}current_release_id`, newRelease.id);
    setShowReleaseDialog(false);
  };

  const handleSelectRelease = (releaseId: string) => {
    const release = availableReleases.find(r => r.id === releaseId);
    if (release) {
      setCurrentRelease(release);
      localStorage.setItem(`${STORAGE_PREFIX}current_release_id`, release.id);
    }
  };

  const updateCurrentRelease = (updates: Partial<ProductionRelease>) => {
    if (!currentRelease) return;
    
    const updatedRelease = { ...currentRelease, ...updates };
    setCurrentRelease(updatedRelease);
    saveProductionRelease(updatedRelease);
    
    // Notify parent component if callback is provided
    if (onReleaseUpdated) {
      onReleaseUpdated();
    }
  };

  const updateReleaseStep = (stepId: number, status: 'pending' | 'in_progress' | 'completed' | 'skipped', metadata?: Record<string, any>) => {
    if (!currentRelease) return;
    
    const updatedSteps = currentRelease.steps.map(step => {
      if (step.stepId === stepId) {
        return {
          ...step,
          status,
          completedAt: status === 'completed' ? Date.now() : step.completedAt,
          metadata: metadata ? { ...step.metadata, ...metadata } : step.metadata,
        };
      }
      return step;
    });

    // Check if all steps are now completed
    const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');
    
    updateCurrentRelease({ 
      steps: updatedSteps,
      status: allStepsCompleted ? 'completed' : 'in_progress',
      completedAt: allStepsCompleted ? Date.now() : currentRelease.completedAt,
    });
  };

  const updateSteps = () => {
    // Filter deployments by current release if available
    const releaseDeployments = currentRelease 
      ? deployments.filter(d => d.productionReleaseId === currentRelease.id)
      : deployments;

    // Check if staging deployments exist
    const stagingDeployments = releaseDeployments.filter(d => 
      d.environment?.toLowerCase().includes('staging') || 
      d.environment?.toLowerCase().includes('qa')
    );
    const hasStagingDeployments = stagingDeployments.length > 0;
    const stagingDeploymentsComplete = stagingDeployments.every(d => d.status === 'success');
    
    // Check QA sign-off - prioritize release data, fallback to localStorage
    const hasQASignOff = currentRelease?.qaSignOff !== undefined || 
                        localStorage.getItem(`${STORAGE_PREFIX}qa_signoff`) !== null;
    
    // Check compliance file
    const hasComplianceFile = currentRelease?.complianceFile !== undefined ||
                             localStorage.getItem(`${STORAGE_PREFIX}compliance_file`) !== null;
    
    // Check PO sign-off
    const hasPOSignOff = currentRelease?.poSignOff !== undefined ||
                        localStorage.getItem(`${STORAGE_PREFIX}po_signoff`) !== null;
    
    // Check production deployments
    const prodDeployments = releaseDeployments.filter(d => 
      d.environment?.toLowerCase().includes('prod')
    );
    const hasProdDeployments = prodDeployments.length > 0;
    const prodDeploymentsComplete = prodDeployments.every(d => d.status === 'success');
    
    // Check step statuses from release object or localStorage
    const getStepStatus = (stepId: number, fallbackKey: string): boolean => {
      if (currentRelease) {
        const step = currentRelease.steps.find(s => s.stepId === stepId);
        return step?.status === 'completed';
      }
      return localStorage.getItem(`${STORAGE_PREFIX}${fallbackKey}`) === 'true';
    };

    const stagingEmailSent = getStepStatus(2, 'staging_email_sent');
    const prodEmailSent = getStepStatus(4, 'prod_email_sent');
    const prodCompleteEmailSent = getStepStatus(7, 'prod_complete_email_sent');
    const step1ManuallyCompleted = getStepStatus(1, 'step_1_completed');
    const step6ManuallyCompleted = getStepStatus(6, 'step_6_completed');
    const step8ManuallyCompleted = getStepStatus(8, 'step_8_completed');
    
    const newSteps: ProductionStep[] = [
      {
        id: 1,
        title: 'Deploy to Staging',
        description: 'Staging environment is up to date with current release',
        status: step1ManuallyCompleted || (hasStagingDeployments && stagingDeploymentsComplete) ? 'completed' : 'pending',
        icon: GitBranch,
        requiresAction: true,
      },
      {
        id: 2,
        title: 'Notify QA - Staging Ready',
        description: 'Email QA team to perform tests on staging environment',
        status: stagingEmailSent ? 'completed' : hasStagingDeployments && stagingDeploymentsComplete ? 'pending' : 'pending',
        icon: Mail,
        requiresAction: true,
      },
      {
        id: 3,
        title: 'QA Sign-off',
        description: 'QA team approves staging deployment',
        status: hasQASignOff ? 'completed' : 'pending',
        icon: ClipboardCheck,
        requiresAction: true,
      },
      {
        id: 4,
        title: 'Notify - Start Production Release',
        description: 'Email stakeholders with QA compliance documentation',
        status: prodEmailSent ? 'completed' : hasQASignOff && hasComplianceFile ? 'pending' : 'pending',
        icon: Mail,
        requiresAction: true,
      },
      {
        id: 5,
        title: 'Product Owner Sign-off',
        description: 'Product owner approves production deployment',
        status: hasPOSignOff ? 'completed' : 'pending',
        icon: UserCheck,
        requiresAction: true,
      },
      {
        id: 6,
        title: 'Deploy to Production',
        description: 'Execute production deployment',
        status: step6ManuallyCompleted || (hasProdDeployments && prodDeploymentsComplete) ? 'completed' : hasProdDeployments ? 'in_progress' : 'pending',
        icon: Rocket,
        requiresAction: true,
      },
      {
        id: 7,
        title: 'Notify QA - Production Complete',
        description: 'Email QA to perform production verification tests',
        status: prodCompleteEmailSent ? 'completed' : hasProdDeployments && prodDeploymentsComplete ? 'pending' : 'pending',
        icon: Mail,
        requiresAction: true,
      },
      {
        id: 8,
        title: 'Create GitHub Release',
        description: 'Generate release with release notes',
        status: step8ManuallyCompleted ? 'completed' : 'pending',
        icon: FileCheck,
        requiresAction: true,
      },
    ];
    
    setSteps(newSteps);
    
    // Set current step to first incomplete
    const firstIncomplete = newSteps.findIndex(s => s.status !== 'completed');
    if (firstIncomplete >= 0) {
      setCurrentStepIndex(firstIncomplete);
    }
  };

  const getStepIcon = (step: ProductionStep) => {
    const IconComponent = step.icon;
    
    if (step.status === 'completed') {
      return <CheckCircle2 className="w-6 h-6" style={{ color: '#10b981' }} />;
    } else if (step.status === 'in_progress') {
      return <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7c3aed' }} />;
    } else {
      return (
        <IconComponent 
          className="w-6 h-6" 
          style={{ color: step.id === currentStepIndex + 1 ? '#7c3aed' : '#d1d5db' }} 
        />
      );
    }
  };

  const getStepBadge = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="text-white text-xs" style={{ background: '#10b981' }}>Completed</Badge>;
      case 'in_progress':
        return <Badge className="text-white text-xs" style={{ background: '#7c3aed' }}>In Progress</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="text-xs" style={{ borderColor: '#9ca3af', color: '#6b7280' }}>Skipped</Badge>;
      default:
        return <Badge variant="outline" className="text-xs" style={{ borderColor: '#d1d5db', color: '#6b7280' }}>Pending</Badge>;
    }
  };

  const calculateProgress = () => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  // Email template generators
  const generateStagingEmailTemplate = (): EmailTemplate => {
    const releaseNumber = currentRelease?.releaseNumber || 
                         deployments.find(d => d.globalReleaseNumber)?.globalReleaseNumber || 
                         'TBD';
    return {
      to: stagingEmailRecipients,
      subject: `[QA Required] Staging Environment Ready - Release ${releaseNumber}`,
      body: `Hello QA Team,

The staging environment has been successfully updated with Release ${releaseNumber}.

Project: ${project.name}
Release Number: ${releaseNumber}
Deployed at: ${new Date().toLocaleString()}

Pipelines deployed:
${project.pipelines.filter(p => p.environment?.toLowerCase().includes('staging') || p.environment?.toLowerCase().includes('qa')).map(p => `  • ${p.name} (${p.environment || p.branch})`).join('\n')}

Please perform your testing on the staging environment and provide sign-off once validation is complete.

Thank you,
Deployment Team`
    };
  };

  const generateProductionEmailTemplate = (): EmailTemplate => {
    const releaseNumber = currentRelease?.releaseNumber || 
                         deployments.find(d => d.globalReleaseNumber)?.globalReleaseNumber || 
                         'TBD';
    return {
      to: prodEmailRecipients,
      subject: `[Production Release] Starting Production Deployment - Release ${releaseNumber}`,
      body: `Hello Team,

We are initiating the production deployment for Release ${releaseNumber}.

Project: ${project.name}
Release Number: ${releaseNumber}
QA Sign-off: ${qaSignOff.testerName || 'Provided'} on ${qaSignOff.testDate}
PO Approval: Pending
Compliance Documentation: ${complianceFile ? 'Attached' : 'Available'}

Pipelines to be deployed:
${project.pipelines.filter(p => p.environment?.toLowerCase().includes('prod')).map(p => `  • ${p.name}`).join('\n')}

Deployment will proceed upon Product Owner approval.

Best regards,
Deployment Team`
    };
  };

  const generateProductionCompleteEmailTemplate = (): EmailTemplate => {
    const releaseNumber = deployments.find(d => d.globalReleaseNumber)?.globalReleaseNumber || 'TBD';
    return {
      to: stagingEmailRecipients,
      subject: `[QA Required] Production Deployment Complete - Release ${releaseNumber}`,
      body: `Hello QA Team,

Production deployment for Release ${releaseNumber} has been completed successfully.

Project: ${project.name}
Release Number: ${releaseNumber}
Deployed at: ${new Date().toLocaleString()}

Pipelines deployed:
${project.pipelines.filter(p => p.environment?.toLowerCase().includes('prod')).map(p => `  • ${p.name}`).join('\n')}

Please perform your production verification tests to ensure everything is functioning as expected.

Thank you,
Deployment Team`
    };
  };

  const copyEmailToClipboard = (template: EmailTemplate) => {
    const emailText = `To: ${template.to}\nSubject: ${template.subject}\n\n${template.body}`;
    
    // Use textarea method for maximum compatibility (works in all environments)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = emailText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        alert('Email template copied to clipboard!');
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please copy the text manually.');
    }
  };

  const handleStagingEmailSent = () => {
    if (currentRelease) {
      // Update step status and email recipients in a single update
      const updatedSteps = currentRelease.steps.map(step => {
        if (step.stepId === 2) {
          return {
            ...step,
            status: 'completed' as const,
            completedAt: Date.now(),
            metadata: { ...step.metadata, emailSent: true, recipients: stagingEmailRecipients },
          };
        }
        return step;
      });

      // Check if all steps are now completed
      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');

      updateCurrentRelease({
        steps: updatedSteps,
        emailRecipients: {
          ...currentRelease.emailRecipients,
          staging: stagingEmailRecipients,
        },
        status: allStepsCompleted ? 'completed' : 'in_progress',
        completedAt: allStepsCompleted ? Date.now() : currentRelease.completedAt,
      });
    } else {
      saveToStorage('staging_email_sent', true);
      saveToStorage('email_recipients', {
        staging: stagingEmailRecipients,
        production: prodEmailRecipients,
      });
      updateSteps();
    }
    setStagingEmailDialog(false);
  };

  const handleQASignOff = () => {
    if (!qaSignOff.testerName || !qaSignOff.testsPassed) {
      return;
    }
    if (currentRelease) {
      // Update step status and QA sign-off in a single update
      const updatedSteps = currentRelease.steps.map(step => {
        if (step.stepId === 3) {
          return {
            ...step,
            status: 'completed' as const,
            completedAt: Date.now(),
          };
        }
        return step;
      });

      // Check if all steps are now completed
      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');

      updateCurrentRelease({
        steps: updatedSteps,
        qaSignOff,
        status: allStepsCompleted ? 'completed' : 'in_progress',
        completedAt: allStepsCompleted ? Date.now() : currentRelease.completedAt,
      });
    } else {
      saveToStorage('qa_signoff', qaSignOff);
      updateSteps();
    }
    setQaSignOffDialog(false);
  };

  const handleComplianceFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const complianceData: ComplianceFile = {
        fileName: file.name,
        fileContent: content,
        uploadDate: new Date().toISOString(),
      };
      setComplianceFile(complianceData);
      if (currentRelease) {
        updateCurrentRelease({ complianceFile: complianceData });
      } else {
        saveToStorage('compliance_file', complianceData);
      }
    };
    reader.readAsText(file);
  };

  const downloadComplianceFile = () => {
    if (!complianceFile) return;
    
    const blob = new Blob([complianceFile.fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = complianceFile.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleProdEmailSent = () => {
    if (!complianceFile) {
      return;
    }
    if (currentRelease) {
      // Update step status and email recipients in a single update
      const updatedSteps = currentRelease.steps.map(step => {
        if (step.stepId === 4) {
          return {
            ...step,
            status: 'completed' as const,
            completedAt: Date.now(),
            metadata: { ...step.metadata, emailSent: true, recipients: prodEmailRecipients },
          };
        }
        return step;
      });

      // Check if all steps are now completed
      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');

      updateCurrentRelease({
        steps: updatedSteps,
        emailRecipients: {
          ...currentRelease.emailRecipients,
          production: prodEmailRecipients,
        },
        status: allStepsCompleted ? 'completed' : 'in_progress',
        completedAt: allStepsCompleted ? Date.now() : currentRelease.completedAt,
      });
    } else {
      saveToStorage('prod_email_sent', true);
      saveToStorage('email_recipients', {
        staging: stagingEmailRecipients,
        production: prodEmailRecipients,
      });
      updateSteps();
    }
    setProdEmailDialog(false);
  };

  const handlePOSignOff = () => {
    if (!poSignOff.ownerName) {
      return;
    }
    if (currentRelease) {
      // Update step status and PO sign-off in a single update
      const updatedSteps = currentRelease.steps.map(step => {
        if (step.stepId === 5) {
          return {
            ...step,
            status: 'completed' as const,
            completedAt: Date.now(),
          };
        }
        return step;
      });

      // Check if all steps are now completed
      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');

      updateCurrentRelease({
        steps: updatedSteps,
        poSignOff,
        status: allStepsCompleted ? 'completed' : 'in_progress',
        completedAt: allStepsCompleted ? Date.now() : currentRelease.completedAt,
      });
    } else {
      saveToStorage('po_signoff', poSignOff);
      updateSteps();
    }
    setPoSignOffDialog(false);
  };

  const handleProdCompleteEmailSent = () => {
    if (currentRelease) {
      // Update step status in a single update
      const updatedSteps = currentRelease.steps.map(step => {
        if (step.stepId === 7) {
          return {
            ...step,
            status: 'completed' as const,
            completedAt: Date.now(),
            metadata: { ...step.metadata, emailSent: true },
          };
        }
        return step;
      });

      // Check if all steps are now completed
      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');

      updateCurrentRelease({
        steps: updatedSteps,
        status: allStepsCompleted ? 'completed' : 'in_progress',
        completedAt: allStepsCompleted ? Date.now() : currentRelease.completedAt,
      });
    } else {
      saveToStorage('prod_complete_email_sent', true);
      updateSteps();
    }
    setProdCompleteEmailDialog(false);
  };

  const handleStepAction = (stepId: number) => {
    switch (stepId) {
      case 2:
        setStagingEmailTemplate(generateStagingEmailTemplate());
        setStagingEmailDialog(true);
        break;
      case 3:
        setQaSignOffDialog(true);
        break;
      case 4:
        setProdEmailDialog(true);
        break;
      case 5:
        setPoSignOffDialog(true);
        break;
      case 6:
        onDeployToProduction();
        break;
      case 7:
        setProdCompleteEmailDialog(true);
        break;
      case 8:
        setReleaseDialog(true);
        break;
    }
  };

  const canExecuteStep = (stepId: number): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;
    
    // Check if previous steps are completed
    const previousSteps = steps.filter(s => s.id < stepId);
    const allPreviousCompleted = previousSteps.every(s => s.status === 'completed' || s.status === 'skipped');
    
    return allPreviousCompleted && step.status !== 'completed';
  };

  const resetProcess = () => {
    if (confirm('Are you sure you want to reset the entire production release process? This will clear all sign-offs and email records.')) {
      localStorage.removeItem(`${STORAGE_PREFIX}qa_signoff`);
      localStorage.removeItem(`${STORAGE_PREFIX}po_signoff`);
      localStorage.removeItem(`${STORAGE_PREFIX}compliance_file`);
      localStorage.removeItem(`${STORAGE_PREFIX}staging_email_sent`);
      localStorage.removeItem(`${STORAGE_PREFIX}prod_email_sent`);
      localStorage.removeItem(`${STORAGE_PREFIX}prod_complete_email_sent`);
      localStorage.removeItem(`${STORAGE_PREFIX}email_recipients`);
      localStorage.removeItem(`${STORAGE_PREFIX}step_1_completed`);
      localStorage.removeItem(`${STORAGE_PREFIX}step_6_completed`);
      localStorage.removeItem(`${STORAGE_PREFIX}step_8_completed`);
      
      setQaSignOff({
        testerName: '',
        testDate: new Date().toISOString().split('T')[0],
        testEnvironment: 'staging',
        testsPassed: false,
        comments: '',
      });
      setPoSignOff({
        ownerName: '',
        approvalDate: new Date().toISOString().split('T')[0],
        comments: '',
      });
      setComplianceFile(null);
      setStagingEmailRecipients('');
      setProdEmailRecipients('');
      
      // Reset release to draft if it exists
      if (currentRelease) {
        const resetSteps = currentRelease.steps.map(step => ({
          stepId: step.stepId,
          status: 'pending' as const,
          completedAt: undefined,
          metadata: undefined,
        }));
        
        updateCurrentRelease({
          steps: resetSteps,
          status: 'draft',
          completedAt: undefined,
        });
      }
      
      updateSteps();
    }
  };

  const markAllComplete = () => {
    if (confirm('Are you sure you want to mark all steps as complete? This will bypass the entire production release process.')) {
      if (currentRelease) {
        // Mark all steps as completed in the release
        const completedSteps = currentRelease.steps.map(step => ({
          ...step,
          status: 'completed' as const,
          completedAt: Date.now(),
        }));
        
        updateCurrentRelease({
          steps: completedSteps,
          status: 'completed',
          completedAt: Date.now(),
        });
      } else {
        // Fallback to localStorage
        saveToStorage('step_1_completed', true);
        saveToStorage('staging_email_sent', true);
        saveToStorage('qa_signoff', {
          testerName: 'Bypassed',
          testDate: new Date().toISOString().split('T')[0],
          testEnvironment: 'staging',
          testsPassed: true,
          comments: 'Manually bypassed',
        });
        saveToStorage('prod_email_sent', true);
        saveToStorage('po_signoff', {
          ownerName: 'Bypassed',
          approvalDate: new Date().toISOString().split('T')[0],
          comments: 'Manually bypassed',
        });
        saveToStorage('step_6_completed', true);
        saveToStorage('prod_complete_email_sent', true);
        saveToStorage('step_8_completed', true);
        updateSteps();
      }
    }
  };

  return (
    <>
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
              <div className="flex items-center gap-2">
                <Badge className="text-white px-4 py-1" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}>
                  PRODUCTION
                </Badge>
                {currentRelease?.status === 'completed' && (
                  <Badge className="text-white px-3 py-1" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    COMPLETED
                  </Badge>
                )}
                {isOpen && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={markAllComplete}
                      className="text-xs text-white"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981' }}
                      disabled={currentRelease?.status === 'completed'}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark All Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={resetProcess}
                      className="text-xs"
                      style={{ borderColor: '#e9d5ff', color: '#7c3aed' }}
                    >
                      Reset Process
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {!isOpen && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-1.5">
                    {getStepIcon(step)}
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
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                      index === currentStepIndex ? 'border-purple-400 bg-white shadow-md' : 'border-purple-200 bg-white/50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getStepIcon(step)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold truncate" style={{ color: '#6b21a8' }}>
                          Step {step.id}: {step.title}
                        </h4>
                        {getStepBadge(step.status)}
                      </div>
                      <p className="text-sm mb-2" style={{ color: '#7c3aed' }}>
                        {step.description}
                      </p>
                      
                      {/* Show stored data for completed steps */}
                      {step.status === 'completed' && (() => {
                        if (step.id === 2 && stagingEmailRecipients) {
                          return (
                            <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                              <div className="text-xs" style={{ color: '#1e40af' }}>
                                <strong>Email sent to:</strong> {stagingEmailRecipients}
                              </div>
                            </div>
                          );
                        }
                        if (step.id === 3 && qaSignOff.testerName) {
                          return (
                            <div className="mt-2 p-2 rounded bg-green-50 border border-green-200">
                              <div className="text-xs space-y-1" style={{ color: '#065f46' }}>
                                <div><strong>Tester:</strong> {qaSignOff.testerName}</div>
                                <div><strong>Date:</strong> {qaSignOff.testDate}</div>
                                <div><strong>Environment:</strong> {qaSignOff.testEnvironment}</div>
                                {qaSignOff.comments && <div><strong>Comments:</strong> {qaSignOff.comments}</div>}
                              </div>
                            </div>
                          );
                        }
                        if (step.id === 4 && complianceFile) {
                          return (
                            <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                              <div className="text-xs flex items-center justify-between" style={{ color: '#1e40af' }}>
                                <div>
                                  <div><strong>Compliance File:</strong> {complianceFile.fileName}</div>
                                  <div><strong>Uploaded:</strong> {new Date(complianceFile.uploadDate).toLocaleString()}</div>
                                  <div><strong>Email sent to:</strong> {prodEmailRecipients}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={downloadComplianceFile}
                                  className="ml-2"
                                  style={{ borderColor: '#3b82f6', color: '#1e40af' }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        }
                        if (step.id === 5 && poSignOff.ownerName) {
                          return (
                            <div className="mt-2 p-2 rounded bg-green-50 border border-green-200">
                              <div className="text-xs space-y-1" style={{ color: '#065f46' }}>
                                <div><strong>Product Owner:</strong> {poSignOff.ownerName}</div>
                                <div><strong>Approval Date:</strong> {poSignOff.approvalDate}</div>
                                {poSignOff.comments && <div><strong>Comments:</strong> {poSignOff.comments}</div>}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Reset button for completed steps */}
                      {step.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Are you sure you want to reset "${step.title}"?`)) {
                              if (currentRelease) {
                                updateReleaseStep(step.id, 'pending');
                              } else {
                                // Clear the specific step completion flag
                                localStorage.removeItem(`${STORAGE_PREFIX}step_${step.id}_completed`);
                                
                                // Clear step-specific data
                                if (step.id === 2) {
                                  localStorage.removeItem(`${STORAGE_PREFIX}staging_email_sent`);
                                } else if (step.id === 3) {
                                  localStorage.removeItem(`${STORAGE_PREFIX}qa_signoff`);
                                  setQaSignOff({
                                    testerName: '',
                                    testDate: new Date().toISOString().split('T')[0],
                                    testEnvironment: 'staging',
                                    testsPassed: false,
                                    comments: '',
                                  });
                                } else if (step.id === 4) {
                                  localStorage.removeItem(`${STORAGE_PREFIX}prod_email_sent`);
                                  localStorage.removeItem(`${STORAGE_PREFIX}compliance_file`);
                                  setComplianceFile(null);
                                } else if (step.id === 5) {
                                  localStorage.removeItem(`${STORAGE_PREFIX}po_signoff`);
                                  setPoSignOff({
                                    ownerName: '',
                                    approvalDate: new Date().toISOString().split('T')[0],
                                    comments: '',
                                  });
                                } else if (step.id === 7) {
                                  localStorage.removeItem(`${STORAGE_PREFIX}prod_complete_email_sent`);
                                }
                                updateSteps();
                              }
                            }
                          }}
                          className="text-xs mt-2"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reset Step
                        </Button>
                      )}
                      
                      {step.requiresAction && canExecuteStep(step.id) && step.status !== 'completed' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleStepAction(step.id)}
                            className="text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
                          >
                            {step.id === 2 || step.id === 4 || step.id === 7 ? 'Compose Email' :
                             step.id === 3 ? 'Provide Sign-off' :
                             step.id === 5 ? 'Approve Release' :
                             step.id === 6 ? 'Deploy to Production' :
                             step.id === 8 ? 'Create Release' : 'Execute'}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                          {(step.id === 1 || step.id === 6 || step.id === 8) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (currentRelease) {
                                  updateReleaseStep(step.id, 'completed');
                                } else {
                                  saveToStorage(`step_${step.id}_completed`, true);
                                  updateSteps();
                                }
                              }}
                              className="text-xs"
                              style={{ borderColor: '#10b981', color: '#10b981' }}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Mark as Complete
                            </Button>
                          )}
                        </div>
                      )}

                      {!canExecuteStep(step.id) && step.status !== 'completed' && step.id !== 1 && (
                        <Alert className="mt-2 border-amber-200 bg-amber-50">
                          <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                          <AlertDescription className="text-xs" style={{ color: '#92400e' }}>
                            Complete previous steps before proceeding
                          </AlertDescription>
                        </Alert>
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

      {/* Step 2: Staging Email Dialog */}
      <Dialog open={stagingEmailDialog} onOpenChange={setStagingEmailDialog}>
        <DialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <Mail className="w-5 h-5" style={{ color: '#7c3aed' }} />
              Notify QA - Staging Ready
            </DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Send email to QA team requesting staging environment testing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Email Recipients (comma-separated)</Label>
              <Input
                value={stagingEmailRecipients}
                onChange={(e) => setStagingEmailRecipients(e.target.value)}
                placeholder="qa-team@example.com, tester1@example.com"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            {stagingEmailTemplate && (
              <>
                <div className="space-y-2">
                  <Label style={{ color: '#374151' }}>Subject</Label>
                  <Input
                    value={stagingEmailTemplate.subject}
                    onChange={(e) => setStagingEmailTemplate({ ...stagingEmailTemplate, subject: e.target.value })}
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#374151' }}>Email Body</Label>
                  <Textarea
                    value={stagingEmailTemplate.body}
                    onChange={(e) => setStagingEmailTemplate({ ...stagingEmailTemplate, body: e.target.value })}
                    rows={12}
                    style={{ borderColor: '#d1d5db', fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => copyEmailToClipboard(stagingEmailTemplate)}
                  className="w-full"
                  style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStagingEmailDialog(false)}
              style={{ color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStagingEmailSent}
              className="text-white"
              style={{ background: '#7c3aed' }}
              disabled={!stagingEmailRecipients}
            >
              <Mail className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 3: QA Sign-off Dialog */}
      <Dialog open={qaSignOffDialog} onOpenChange={setQaSignOffDialog}>
        <DialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <ClipboardCheck className="w-5 h-5" style={{ color: '#7c3aed' }} />
              QA Sign-off
            </DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Record QA team approval for staging deployment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Tester Name *</Label>
              <Input
                value={qaSignOff.testerName}
                onChange={(e) => setQaSignOff({ ...qaSignOff, testerName: e.target.value })}
                placeholder="John Doe"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Test Date *</Label>
              <Input
                type="date"
                value={qaSignOff.testDate}
                onChange={(e) => setQaSignOff({ ...qaSignOff, testDate: e.target.value })}
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Environment</Label>
              <Select
                value={qaSignOff.testEnvironment}
                onValueChange={(value: 'staging' | 'production') => setQaSignOff({ ...qaSignOff, testEnvironment: value })}
              >
                <SelectTrigger style={{ borderColor: '#d1d5db' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tests-passed"
                checked={qaSignOff.testsPassed}
                onCheckedChange={(checked) => setQaSignOff({ ...qaSignOff, testsPassed: checked as boolean })}
              />
              <label
                htmlFor="tests-passed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                style={{ color: '#374151' }}
              >
                All tests passed successfully *
              </label>
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Comments (optional)</Label>
              <Textarea
                value={qaSignOff.comments}
                onChange={(e) => setQaSignOff({ ...qaSignOff, comments: e.target.value })}
                rows={4}
                placeholder="Any additional notes or observations..."
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQaSignOffDialog(false)}
              style={{ color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQASignOff}
              className="text-white"
              style={{ background: '#10b981' }}
              disabled={!qaSignOff.testerName || !qaSignOff.testsPassed}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 4: Production Email Dialog */}
      <Dialog open={prodEmailDialog} onOpenChange={setProdEmailDialog}>
        <DialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <Mail className="w-5 h-5" style={{ color: '#7c3aed' }} />
              Start Production Release
            </DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Send email to stakeholders with release compliance documentation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Release Compliance File *</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={handleComplianceFileUpload}
                  accept=".txt,.pdf,.doc,.docx,.md"
                  style={{ borderColor: '#d1d5db' }}
                />
                {complianceFile && (
                  <Badge className="text-white" style={{ background: '#10b981' }}>
                    <FileCheck className="w-3 h-3 mr-1" />
                    Uploaded
                  </Badge>
                )}
              </div>
              {complianceFile && (
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    File: {complianceFile.fileName} • Uploaded: {new Date(complianceFile.uploadDate).toLocaleString()}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadComplianceFile}
                    style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Email Recipients (comma-separated)</Label>
              <Input
                value={prodEmailRecipients}
                onChange={(e) => setProdEmailRecipients(e.target.value)}
                placeholder="po@example.com, stakeholder@example.com"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            {prodEmailRecipients && (
              <>
                <div className="space-y-2">
                  <Label style={{ color: '#374151' }}>Email Preview</Label>
                  <Textarea
                    value={generateProductionEmailTemplate().body}
                    readOnly
                    rows={10}
                    style={{ borderColor: '#d1d5db', fontFamily: 'monospace', fontSize: '0.875rem', background: '#f9fafb' }}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => copyEmailToClipboard(generateProductionEmailTemplate())}
                  className="w-full"
                  style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProdEmailDialog(false)}
              style={{ color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProdEmailSent}
              className="text-white"
              style={{ background: '#7c3aed' }}
              disabled={!complianceFile || !prodEmailRecipients}
            >
              <Mail className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 5: PO Sign-off Dialog */}
      <Dialog open={poSignOffDialog} onOpenChange={setPoSignOffDialog}>
        <DialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <UserCheck className="w-5 h-5" style={{ color: '#7c3aed' }} />
              Product Owner Sign-off
            </DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Record Product Owner approval for production deployment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Product Owner Name *</Label>
              <Input
                value={poSignOff.ownerName}
                onChange={(e) => setPoSignOff({ ...poSignOff, ownerName: e.target.value })}
                placeholder="Jane Smith"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Approval Date *</Label>
              <Input
                type="date"
                value={poSignOff.approvalDate}
                onChange={(e) => setPoSignOff({ ...poSignOff, approvalDate: e.target.value })}
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Comments (optional)</Label>
              <Textarea
                value={poSignOff.comments}
                onChange={(e) => setPoSignOff({ ...poSignOff, comments: e.target.value })}
                rows={4}
                placeholder="Any additional notes or conditions..."
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />
              <AlertDescription className="text-xs" style={{ color: '#92400e' }}>
                By approving, you authorize the production deployment to proceed.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPoSignOffDialog(false)}
              style={{ color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePOSignOff}
              className="text-white"
              style={{ background: '#10b981' }}
              disabled={!poSignOff.ownerName}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 7: Production Complete Email Dialog */}
      <Dialog open={prodCompleteEmailDialog} onOpenChange={setProdCompleteEmailDialog}>
        <DialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <Mail className="w-5 h-5" style={{ color: '#10b981' }} />
              Production Deployment Complete
            </DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Notify QA team to perform production verification tests
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Email Preview</Label>
              <Textarea
                value={generateProductionCompleteEmailTemplate().body}
                readOnly
                rows={12}
                style={{ borderColor: '#d1d5db', fontFamily: 'monospace', fontSize: '0.875rem', background: '#f9fafb' }}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => copyEmailToClipboard(generateProductionCompleteEmailTemplate())}
              className="w-full"
              style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProdCompleteEmailDialog(false)}
              style={{ color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProdCompleteEmailSent}
              className="text-white"
              style={{ background: '#10b981' }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 8: GitHub Release Dialog */}
      <Dialog open={releaseDialog} onOpenChange={setReleaseDialog}>
        <DialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <FileCheck className="w-5 h-5" style={{ color: '#7c3aed' }} />
              Create GitHub Release
            </DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Create a new release for your repository with tags and release notes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Repository</Label>
              <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                <SelectTrigger style={{ borderColor: '#d1d5db' }}>
                  <SelectValue placeholder="Choose a repository" />
                </SelectTrigger>
                <SelectContent>
                  {project.repositories.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name} ({repo.owner}/{repo.repo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRepository && (
              <ReleaseCreator
                repository={project.repositories.find(r => r.id === selectedRepository)}
                onSuccess={() => {
                  // Mark step 8 as completed
                  if (currentRelease) {
                    updateReleaseStep(8, 'completed');
                  } else {
                    saveToStorage('step_8_completed', true);
                    updateSteps();
                  }
                  setReleaseDialog(false);
                }}
                onCancel={() => setReleaseDialog(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
