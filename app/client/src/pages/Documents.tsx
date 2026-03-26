import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  FileText,
  Upload,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Lock,
  FileCheck,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const documentTypes = [
  { value: "passport", label: "Passport", description: "Valid passport with photo page" },
  { value: "visa", label: "Visa", description: "F-1, J-1, M-1, or other student visa" },
  { value: "i20", label: "I-20", description: "Certificate of Eligibility for Student Status" },
  { value: "ds2019", label: "DS-2019", description: "Certificate of Eligibility for Exchange Visitor Status" },
  { value: "enrollment_letter", label: "Enrollment Letter", description: "Official university enrollment verification" },
  { value: "financial_statement", label: "Financial Statement", description: "Bank statement or financial proof" },
  { value: "bank_statement", label: "Bank Statement", description: "Recent bank statement showing funds" },
  { value: "scholarship_letter", label: "Scholarship Letter", description: "Official scholarship award letter" },
  { value: "guarantor_letter", label: "Guarantor Letter", description: "Letter from financial guarantor" },
  { value: "proof_of_income", label: "Proof of Income", description: "Employment or income verification" },
  { value: "other", label: "Other", description: "Other supporting documents" },
];

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending Review" },
  verified: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", label: "Verified" },
  rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Rejected" },
  expired: { icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-400/10", label: "Expired" },
};

export default function Documents() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const utils = trpc.useUtils();
  
  const { data: documents, isLoading } = trpc.documents.myDocuments.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedType("");
      utils.documents.myDocuments.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to upload document");
    },
  });
  
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      utils.documents.myDocuments.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to delete document");
    },
  });
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      // Check file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only PDF, JPEG, PNG, and WebP files are allowed");
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      toast.error("Please select a document type and file");
      return;
    }
    
    setUploading(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        await uploadMutation.mutateAsync({
          documentType: selectedType as any,
          fileName: selectedFile.name,
          fileData: base64,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
        });
        
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      setUploading(false);
    }
  };
  
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate({ id });
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container px-6 py-20">
            <motion.div
              className="max-w-md mx-auto text-center"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.h1 variants={fadeInUp} className="text-2xl font-bold mb-4">
                Sign In Required
              </motion.h1>
              <motion.p variants={fadeInUp} className="text-muted-foreground mb-8">
                Please sign in to manage your documents securely.
              </motion.p>
              <motion.div variants={fadeInUp}>
                <a href={getLoginUrl()}>
                  <Button size="lg" className="glow">
                    Sign In
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <div className="container px-6 py-12">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Header */}
            <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">My Documents</h1>
                <p className="text-muted-foreground">
                  Securely upload and manage your verification documents
                </p>
              </div>
              
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="glow gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Upload a verification document. Supported formats: PDF, JPEG, PNG, WebP (max 10MB)
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Document Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>File</Label>
                      <div
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileCheck className="w-5 h-5 text-primary" />
                            <span className="text-sm">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to select a file
                            </p>
                          </div>
                        )}
                      </div>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={handleUpload}
                      disabled={!selectedFile || !selectedType || uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
            
            {/* Security Notice */}
            <motion.div variants={fadeInUp}>
              <Card className="mb-8 border-primary/20 bg-primary/5">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Your Documents Are Secure</h3>
                    <p className="text-sm text-muted-foreground">
                      All documents are encrypted using bank-level security. Your files are only shared with landlords you apply to and can be deleted at any time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Documents Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : documents && documents.length > 0 ? (
              <motion.div
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={staggerContainer}
              >
                {documents.map((doc) => {
                  const status = statusConfig[doc.verificationStatus as keyof typeof statusConfig];
                  const docType = documentTypes.find(t => t.value === doc.documentType);
                  
                  return (
                    <motion.div key={doc.id} variants={fadeInUp}>
                      <Card className="h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {docType?.label || doc.documentType}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </CardDescription>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${status.bg}`}>
                              <status.icon className={`w-3 h-3 ${status.color}`} />
                              <span className={`text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground truncate">
                              {doc.fileName}
                            </div>
                            
                            {doc.verificationNotes && (
                              <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                                <p className="text-muted-foreground">{doc.verificationNotes}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 bg-transparent"
                                onClick={() => window.open(doc.fileUrl, "_blank")}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                onClick={() => handleDelete(doc.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div variants={fadeInUp}>
                <Card className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Upload your verification documents to speed up your rental applications. We support passport, visa, I-20, and more.
                  </p>
                  <Button onClick={() => setUploadDialogOpen(true)} className="glow gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Your First Document
                  </Button>
                </Card>
              </motion.div>
            )}
            
            {/* Required Documents Guide */}
            <motion.div variants={fadeInUp} className="mt-12">
              <h2 className="text-xl font-semibold mb-6">Required Documents for Applications</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentTypes.slice(0, 6).map((type) => (
                  <Card key={type.value} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{type.label}</h3>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
