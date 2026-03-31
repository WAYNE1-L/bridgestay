import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import {
  Building2,
  FileText,
  Heart,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Settings,
  CreditCard,
  Upload,
  GraduationCap,
  Home,
  BarChart3,
  MessageSquare,
  Wand2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  draft: { bg: "bg-muted", text: "text-muted-foreground", icon: Clock },
  submitted: { bg: "bg-blue-500/20", text: "text-blue-400", icon: Clock },
  under_review: { bg: "bg-yellow-500/20", text: "text-yellow-400", icon: Eye },
  documents_requested: { bg: "bg-orange-500/20", text: "text-orange-400", icon: AlertCircle },
  approved: { bg: "bg-green-500/20", text: "text-green-400", icon: CheckCircle2 },
  rejected: { bg: "bg-red-500/20", text: "text-red-400", icon: XCircle },
  withdrawn: { bg: "bg-muted", text: "text-muted-foreground", icon: XCircle },
  lease_signed: { bg: "bg-purple-500/20", text: "text-purple-400", icon: FileText },
  deposit_paid: { bg: "bg-green-500/20", text: "text-green-400", icon: CreditCard },
};

function StudentDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.stats.student.useQuery();
  const { data: applications, isLoading: appsLoading } = trpc.applications.myApplications.useQuery();
  const { data: savedApartments, isLoading: savedLoading } = trpc.apartments.saved.useQuery();
  const { data: documents, isLoading: docsLoading } = trpc.documents.myDocuments.useQuery();
  
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div {...fadeInUp}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalApplications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.approvedApplications || 0} approved
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saved Apartments</CardTitle>
              <Heart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.savedApartments || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Properties saved
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
              <Upload className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{documents?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded documents
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="saved">Saved Apartments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="applications" className="space-y-4">
          {appsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : applications && applications.length > 0 ? (
            applications.map((app: any) => {
              const status = statusColors[app.status] || statusColors.draft;
              const StatusIcon = status.icon;
              
              return (
                <motion.div key={app.id} {...fadeInUp}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Application #{app.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              Applied on {new Date(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={`${status.bg} ${status.text} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {app.status.replace(/_/g, " ")}
                          </Badge>
                          <Link href={`/apartments/${app.apartmentId}`}>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              View Property
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start browsing apartments and submit your first application.
                </p>
                <Link href="/apartments">
                  <Button>Browse Apartments</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="saved" className="space-y-4">
          {savedLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : savedApartments && savedApartments.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {savedApartments.map((apt: any) => (
                <motion.div key={apt.id} {...fadeInUp}>
                  <Link href={`/apartments/${apt.id}`}>
                    <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{apt.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {apt.city}, {apt.state}
                            </p>
                            <p className="text-lg font-bold mt-1">
                              ${Number(apt.monthlyRent).toLocaleString()}/mo
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No saved apartments</h3>
                <p className="text-muted-foreground mb-4">
                  Save apartments you're interested in to compare them later.
                </p>
                <Link href="/apartments">
                  <Button>Browse Apartments</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Your Documents</h3>
              <p className="text-sm text-muted-foreground">
                Upload documents for your rental applications
              </p>
            </div>
            <Button className="gap-2" onClick={() => alert("Document upload coming soon!")}>
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          </div>
          
          {docsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid gap-4">
              {documents.map((doc: any) => (
                <motion.div key={doc.id} {...fadeInUp}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{doc.fileName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {doc.documentType.replace(/_/g, " ")} • {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={
                            doc.verificationStatus === "verified"
                              ? "bg-green-500/20 text-green-400 border-0"
                              : doc.verificationStatus === "rejected"
                              ? "bg-red-500/20 text-red-400 border-0"
                              : "bg-yellow-500/20 text-yellow-400 border-0"
                          }
                        >
                          {doc.verificationStatus}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No documents uploaded</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your passport, visa, and other documents to speed up applications.
                </p>
                <Button onClick={() => alert("Document upload coming soon!")}>
                  Upload Your First Document
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LandlordDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.stats.landlord.useQuery();
  const { data: listings, isLoading: listingsLoading } = trpc.apartments.myListings.useQuery();
  const { data: applications, isLoading: appsLoading } = trpc.applications.landlordApplications.useQuery({});

  return (
    <div className="space-y-8">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/import-listing">
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <MessageSquare className="w-4 h-4" />
            Import from WeChat
          </Button>
        </Link>
        <Link href="/apartments">
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            View All Listings
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <motion.div {...fadeInUp}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalProperties || 0}</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
              <Home className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.activeListings || 0}</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.pendingApplications || 0}</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalViews || 0}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Quick Actions */}
      <motion.div {...fadeInUp}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button className="gap-2" onClick={() => alert("Create listing coming soon!")}>
              <Plus className="w-4 h-4" />
              Add New Property
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={() => alert("Coming soon!")}>
              <BarChart3 className="w-4 h-4" />
              View Analytics
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={() => alert("Coming soon!")}>
              <MessageSquare className="w-4 h-4" />
              Messages
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Tabs */}
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="listings" className="space-y-4">
          {listingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid gap-4">
              {listings.map((listing: any) => (
                <motion.div key={listing.id} {...fadeInUp}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{listing.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {listing.city}, {listing.state} • ${Number(listing.monthlyRent).toLocaleString()}/mo
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {listing.viewCount} views
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            className={
                              listing.status === "active"
                                ? "bg-green-500/20 text-green-400 border-0"
                                : listing.status === "rented"
                                ? "bg-blue-500/20 text-blue-400 border-0"
                                : "bg-muted text-muted-foreground border-0"
                            }
                          >
                            {listing.status}
                          </Badge>
                          <Link href={`/apartments/${listing.id}`}>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No listings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first property listing to start receiving applications.
                </p>
                <Button onClick={() => alert("Create listing coming soon!")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Property
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="applications" className="space-y-4">
          {appsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : applications && applications.length > 0 ? (
            applications.map((app: any) => {
              const status = statusColors[app.status] || statusColors.draft;
              const StatusIcon = status.icon;
              
              return (
                <motion.div key={app.id} {...fadeInUp}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Application #{app.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={`${status.bg} ${status.text} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {app.status.replace(/_/g, " ")}
                          </Badge>
                          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => alert("Review coming soon!")}>
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground">
                  Applications from students will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);
  
  if (loading) {
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
  
  const isLandlord = user?.role === "landlord" || user?.role === "admin";
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <div className="container px-6 py-8">
          {/* Header */}
          <motion.div {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {isLandlord ? (
                  <Building2 className="w-6 h-6 text-primary" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.name || "User"}</h1>
                <p className="text-muted-foreground">
                  {isLandlord ? "Landlord Dashboard" : "Student Dashboard"}
                </p>
              </div>
            </div>
          </motion.div>
          
          {isLandlord ? <LandlordDashboard /> : <StudentDashboard />}
        </div>
      </main>
    </div>
  );
}
