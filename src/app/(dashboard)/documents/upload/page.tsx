import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUpload } from "@/components/documents/document-upload";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload PDFs and images for automatic OCR processing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>
            Drag and drop files or click to browse. Documents will be automatically
            processed to extract text and structured data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUpload />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Document Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Invoices</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vendor, amounts, dates, line items
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Receipts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Merchant, total, tax, payment method
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Contracts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Parties, dates, values, terms
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
