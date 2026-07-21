import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface ReleaseNotesStepProps {
  releaseNotes: string;
  onReleaseNotesChange: (notes: string) => void;
  onNext: () => void;
  onSkip?: () => void;
  isOptional?: boolean;
}

const MAX_CHARS = 2000;

export function ReleaseNotesStep({
  releaseNotes,
  onReleaseNotesChange,
  onNext,
  onSkip,
  isOptional = true,
}: ReleaseNotesStepProps) {
  const [showPreview, setShowPreview] = useState(false);
  const charCount = releaseNotes.length;
  const isFull = charCount >= MAX_CHARS;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      onReleaseNotesChange(value);
    }
  };

  const handleNext = () => {
    onNext();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onNext();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Release Notes</span>
          {isOptional && <Badge variant="outline">Optional</Badge>}
        </CardTitle>
        <CardDescription>
          Document what's being released and any important information for
          stakeholders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Notes (Markdown supported)
              </label>
              {showPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="gap-1"
                >
                  <EyeOff className="w-4 h-4" />
                  Hide Preview
                </Button>
              )}
              {!showPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Show Preview
                </Button>
              )}
            </div>
            <Textarea
              placeholder="Enter release notes... (e.g., 'Fixed payment gateway timeout, added metrics logging')"
              value={releaseNotes}
              onChange={handleChange}
              className={`min-h-[200px] font-mono text-sm ${isFull ? "border-amber-500" : ""}`}
              disabled={isFull}
            />
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  isFull ? "text-amber-600 font-semibold" : "text-gray-500"
                }
              >
                {charCount} / {MAX_CHARS} characters
              </span>
              {isFull && (
                <span className="text-amber-600 text-xs font-semibold">
                  Maximum reached
                </span>
              )}
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="min-h-[200px] p-3 bg-slate-50 border border-slate-200 rounded-md overflow-y-auto">
                {releaseNotes ? (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownPreview content={releaseNotes} />
                  </div>
                ) : (
                  <p className="text-gray-400 italic">
                    Preview will appear here...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {isOptional && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Release notes are optional but recommended for documentation and
              audit trails.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          {isOptional && (
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext} disabled={isFull && charCount === 0}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple markdown preview component
 */
function MarkdownPreview({ content }: { content: string }) {
  // Very basic markdown rendering
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCode = false;
  let codeContent = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      if (inCode) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="bg-gray-100 p-2 rounded text-xs overflow-x-auto"
          >
            <code>{codeContent}</code>
          </pre>,
        );
        codeContent = "";
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeContent += line + "\n";
      continue;
    }

    // Heading
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="font-semibold text-sm mt-2 mb-1">
          {line.substring(3)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="font-bold text-base mt-3 mb-1">
          {line.substring(2)}
        </h2>,
      );
      continue;
    }

    // Bullet point
    if (line.startsWith("- ")) {
      elements.push(
        <li key={`li-${i}`} className="ml-4">
          {line.substring(2)}
        </li>,
      );
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="text-sm mb-1">
          {line}
        </p>,
      );
    }
  }

  return <div>{elements}</div>;
}
