import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  Shield,
  Upload,
  User,
  GraduationCap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { toast } from "sonner";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const FUNDING_SOURCES = [
  { value: "family_support", label: "Family Support" },
  { value: "scholarship", label: "Scholarship" },
  { value: "student_loan", label: "Student Loan" },
  { value: "personal_savings", label: "Personal Savings" },
  { value: "employment", label: "Employment/Part-time Work" },
  { value: "combination", label: "Combination of Sources" },
];

export default function Apply() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [desiredMoveInDate, setDesiredMoveInDate] = useState("");
  const [desiredLeaseTerm, setDesiredLeaseTerm] = useState("12");
  const [personalStatement, setPersonalStatement] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [guarantorAvailable, setGuarantorAvailable] = useState(false);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorRelationship, setGuarantorRelationship] = useState("");
  const [guarantorEmail, setGuarantorEmail] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  
  const { data: apartment, isLoading: apartmentLoading } = trpc.apartments.getById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !!params.id }
  );
  
  const { data: studentProfile } = trpc.profiles.getStudentProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const createApplicationMutation = trpc.applications.create.useMutation();
  const submitApplicationMutation = trpc.applications.submit.useMutation();
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);
  
  const handleSubmit = async () => {
    if (!desiredMoveInDate || !desiredLeaseTerm) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the application
      const result = await createApplicationMutation.mutateAsync({
        apartmentId: parseInt(params.id || "0"),
        desiredMoveInDate,
        desiredLeaseTerm: parseInt(desiredLeaseTerm),
        personalStatement,
        fundingSource: fundingSource as any,
        monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
        guarantorAvailable,
        guarantorName: guarantorAvailable ? guarantorName : undefined,
        guarantorRelationship: guarantorAvailable ? guarantorRelationship : undefined,
        guarantorEmail: guarantorAvailable ? guarantorEmail : undefined,
        guarantorPhone: guarantorAvailable ? guarantorPhone : undefined,
      });
      
      // Submit the application
      await submitApplicationMutation.mutateAsync({ id: result.id! });
      
      toast.success("Application submitted successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || apartmentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  if (!apartment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-6 py-20 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Apartment not found</h2>
          <p className="text-muted-foreground mb-6">
            This listing may have been removed or is no longer available.
          </p>
          <Link href="/apartments">
            <Button>Browse Apartments</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <div className="container px-6 py-8 max-w-4xl">
          {/* Back Button */}
          <Link href={`/apartments/${params.id}`}>
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to listing
            </Button>
          </Link>
          
          {/* Header */}
          <motion.div {...fadeInUp} className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Apply for {apartment.title}</h1>
            <p className="text-muted-foreground">
              {apartment.city}, {apartment.state} • ${Number(apartment.monthlyRent).toLocaleString()}/month
            </p>
          </motion.div>
          
          {/* Progress Steps */}
          <motion.div {...fadeInUp} className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      s <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-full h-1 mx-2 ${
                        s < step ? "bg-primary" : "bg-muted"
                      }`}
                      style={{ width: "100px" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>
                Lease Details
              </span>
              <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>
                Financial Info
              </span>
              <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>
                Review & Submit
              </span>
            </div>
          </motion.div>
          
          {/* No SSN/Credit Banner */}
          <motion.div {...fadeInUp}>
            <Card className="bg-primary/10 border-primary/20 mb-8">
              <CardContent className="p-4 flex items-center gap-4">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold">No SSN or Credit Check Required</h3>
                  <p className="text-sm text-muted-foreground">
                    This application is designed for international students. We use alternative verification methods.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Step 1: Lease Details */}
          {step === 1 && (
            <motion.div {...fadeInUp}>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Lease Details
                  </CardTitle>
                  <CardDescription>
                    Tell us about your desired move-in date and lease term.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="moveInDate">Desired Move-in Date *</Label>
                      <Input
                        id="moveInDate"
                        type="date"
                        value={desiredMoveInDate}
                        onChange={(e) => setDesiredMoveInDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="bg-background"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="leaseTerm">Lease Term (months) *</Label>
                      <Select value={desiredLeaseTerm} onValueChange={setDesiredLeaseTerm}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select lease term" />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 6, 9, 12, 18, 24].map((months) => (
                            <SelectItem key={months} value={months.toString()}>
                              {months} months
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="personalStatement">Personal Statement (Optional)</Label>
                    <Textarea
                      id="personalStatement"
                      placeholder="Tell the landlord a bit about yourself, your studies, and why you're interested in this property..."
                      value={personalStatement}
                      onChange={(e) => setPersonalStatement(e.target.value)}
                      rows={5}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      A personal statement can help your application stand out.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)} className="gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Step 2: Financial Info */}
          {step === 2 && (
            <motion.div {...fadeInUp}>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Information
                  </CardTitle>
                  <CardDescription>
                    Help us understand how you plan to pay for rent. No credit check required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fundingSource">Primary Funding Source</Label>
                      <Select value={fundingSource} onValueChange={setFundingSource}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select funding source" />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNDING_SOURCES.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="monthlyBudget">Monthly Budget (USD)</Label>
                      <Input
                        id="monthlyBudget"
                        type="number"
                        placeholder="e.g., 2000"
                        value={monthlyBudget}
                        onChange={(e) => setMonthlyBudget(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="guarantor">Do you have a guarantor/co-signer?</Label>
                        <p className="text-sm text-muted-foreground">
                          A guarantor can strengthen your application.
                        </p>
                      </div>
                      <Switch
                        id="guarantor"
                        checked={guarantorAvailable}
                        onCheckedChange={setGuarantorAvailable}
                      />
                    </div>
                    
                    {guarantorAvailable && (
                      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="space-y-2">
                          <Label htmlFor="guarantorName">Guarantor Name</Label>
                          <Input
                            id="guarantorName"
                            value={guarantorName}
                            onChange={(e) => setGuarantorName(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guarantorRelationship">Relationship</Label>
                          <Input
                            id="guarantorRelationship"
                            placeholder="e.g., Parent, Relative"
                            value={guarantorRelationship}
                            onChange={(e) => setGuarantorRelationship(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guarantorEmail">Email</Label>
                          <Input
                            id="guarantorEmail"
                            type="email"
                            value={guarantorEmail}
                            onChange={(e) => setGuarantorEmail(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guarantorPhone">Phone</Label>
                          <Input
                            id="guarantorPhone"
                            type="tel"
                            value={guarantorPhone}
                            onChange={(e) => setGuarantorPhone(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2 bg-transparent">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <motion.div {...fadeInUp}>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Review Your Application
                  </CardTitle>
                  <CardDescription>
                    Please review your information before submitting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Summary */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-2">Property</h3>
                    <p className="font-medium">{apartment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {apartment.address}, {apartment.city}, {apartment.state}
                    </p>
                    <p className="text-lg font-bold mt-2">
                      ${Number(apartment.monthlyRent).toLocaleString()}/month
                    </p>
                  </div>
                  
                  {/* Lease Details Summary */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-2">Lease Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Move-in Date:</span>
                        <p className="font-medium">
                          {desiredMoveInDate ? new Date(desiredMoveInDate).toLocaleDateString() : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lease Term:</span>
                        <p className="font-medium">{desiredLeaseTerm} months</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-2">Financial Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Funding Source:</span>
                        <p className="font-medium">
                          {FUNDING_SOURCES.find(s => s.value === fundingSource)?.label || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Budget:</span>
                        <p className="font-medium">
                          {monthlyBudget ? `$${parseFloat(monthlyBudget).toLocaleString()}` : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Guarantor:</span>
                        <p className="font-medium">
                          {guarantorAvailable ? guarantorName : "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Documents Notice */}
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Upload className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold">Documents Required</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          After submitting, you'll need to upload supporting documents such as:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Passport copy</li>
                          <li>• Visa (F-1, J-1, etc.)</li>
                          <li>• I-20 or DS-2019</li>
                          <li>• University enrollment letter</li>
                          <li>• Financial statement or bank statement</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2 bg-transparent">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2 glow"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
