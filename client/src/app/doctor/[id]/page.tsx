"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MapPin,
  Clock,
  Award,
  GraduationCap,
  Building2,
  Phone,
  Mail,
  Calendar,
  Video,
  User as UserIcon,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Doctor } from "@/lib/types";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import PublicLayout from "@/layout/PublicLayout";
import LoginRequired from "@/components/login-required";
import BookAppointmentModal from "@/app/appointments/components/BookAppointmentModal";
import { doctorApi } from "@/app/search-doctor/_api";
import Image from "next/image";
import RatingReviewDialog from "./_components/RatingReviewDialog";
import AvailabilityCalendar from "./_components/AvailabilityCalendar";
import ReviewsList from "./_components/ReviewsList";

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0);

  useEffect(() => {
    if (!doctorId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchDoctor = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await doctorApi.getDoctorById(doctorId);
        if (isMounted) {
          setDoctor(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch doctor"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDoctor();

    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  const handleBookAppointment = () => {
    setShowBookingModal(true);
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader
            title="Loading Doctor Profile"
            description="Fetching doctor information..."
          />
        </div>
      </PublicLayout>
    );
  }

  if (error || !doctor) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-screen px-4">
          <EmptyState
            type="not-found"
            title="Doctor Not Found"
            description={error?.message || "The doctor profile you're looking for doesn't exist."}
            action={{
              label: "Back to Search",
              onClick: () => router.push('/search-doctor'),
              variant: "default",
            }}
          />
        </div>
      </PublicLayout>
    );
  }

  const consultationModes = Array.isArray(doctor.consultationModes) ? doctor.consultationModes : [];

  return (
    <PublicLayout>
      <div className="bg-background min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Sidebar - Doctor Info Card */}
            <div className="lg:col-span-1">
              <Card className="lg:sticky lg:top-6 w-full">
                <CardHeader className="text-center pb-4">
                  <div className="relative mx-auto w-32 h-32 mb-4">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/80 border-4 border-white shadow-lg">
                      {doctor.image ? (
                        <Image
                          src={doctor.image}
                          alt={doctor.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="h-16 w-16 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{doctor.name}</CardTitle>
                  <CardDescription className="text-base flex items-center justify-center gap-2 mt-2">
                    <Award className="h-4 w-4 text-primary" />
                    {doctor.specialization}
                  </CardDescription>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-foreground">{doctor.rating}</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {doctor.experience} years
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{doctor.mobile}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground break-all">{doctor.email}</span>
                    </div>
                    {doctor.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{doctor.address}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Consultation Fee */}
                  <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg p-4 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Consultation Fee</p>
                    <p className="text-2xl font-bold text-primary">PKR {doctor.fee}</p>
                    <p className="text-xs text-muted-foreground">Per consultation</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <LoginRequired 
                      onSuccess={handleBookAppointment}
                      requirePatient={true}
                    >
                      {(handleAction) => (
                        <Button
                          onClick={handleAction}
                          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
                          size="lg"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Book Appointment
                        </Button>
                      )}
                    </LoginRequired>
                    
                    <LoginRequired 
                      onSuccess={() => setShowRatingDialog(true)}
                      requirePatient={true}
                    >
                      {(handleAction) => (
                        <Button
                          onClick={handleAction}
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Rate & Review
                        </Button>
                      )}
                    </LoginRequired>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Content - Detailed Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Qualifications */}
              {doctor.qualifications && doctor.qualifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Qualifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {doctor.qualifications.map((qual, index) => (
                        <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                          {qual}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Specializations */}
              {doctor.specializations && doctor.specializations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Specializations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {doctor.specializations.map((spec, index) => (
                        <Badge key={index} variant="outline" className="text-sm py-1 px-3">
                          {spec.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hospital Information */}
              {doctor.hospital && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Hospital
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-semibold text-lg">{doctor.hospital.name}</p>
                      {doctor.hospital.address && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          {doctor.hospital.address}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Consultation Modes */}
              {consultationModes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      Consultation Modes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {consultationModes.map((mode, index) => (
                        <Badge
                          key={index}
                          variant={mode === 'online' ? 'default' : 'outline'}
                          className="text-sm py-1 px-3 flex items-center gap-1"
                        >
                          {mode === 'online' ? (
                            <Zap className="h-3 w-3" />
                          ) : mode === 'phone' ? (
                            <Phone className="h-3 w-3" />
                          ) : (
                            <UserIcon className="h-3 w-3" />
                          )}
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Availability Calendar */}
              <AvailabilityCalendar doctor={doctor} />

              {/* Reviews List */}
              <ReviewsList key={refreshReviews} doctorId={doctor.id} />

              {/* Experience & Rating */}
              <Card>
                <CardHeader>
                  <CardTitle>Experience & Ratings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-lg p-4 border border-primary/10">
                      <p className="text-sm text-muted-foreground mb-1">Years of Experience</p>
                      <p className="text-2xl font-bold text-foreground">{doctor.experience}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5 rounded-lg p-4 border border-amber-500/10">
                      <p className="text-sm text-muted-foreground mb-1">Patient Satisfaction</p>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        <p className="text-2xl font-bold text-foreground">{doctor.rating}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <BookAppointmentModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        doctor={doctor}
      />

      {doctor && (
        <RatingReviewDialog
          open={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          doctorId={doctor.id}
          doctorName={doctor.lastName || doctor.name}
          onRatingSubmitted={() => {
            // Refresh reviews list and doctor data to show updated rating
            setRefreshReviews((prev) => prev + 1);
            // Optionally refresh doctor data to show updated rating
            const fetchDoctor = async () => {
              try {
                const result = await doctorApi.getDoctorById(doctor.id);
                setDoctor(result);
              } catch (err) {
                // Silently fail - doctor data will update on next page load
              }
            };
            fetchDoctor();
          }}
        />
      )}
    </PublicLayout>
  );
}

