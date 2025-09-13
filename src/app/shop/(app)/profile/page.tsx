
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Mock data based on the XML for a shop profile
const shopProfileData = {
    username: "bole_boutique",
    contactPerson: "Abebe Bikila",
    contactPhone: "+251 912 345 678",
    city: "Addis Ababa",
    exactLocation: "Bole, next to Edna Mall",
    tradeLicenseNumber: "TLN-98765",
    tinNumber: "TIN-54321",
};

export default function ShopProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Shop Profile</h1>
        <Button>Save Changes</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>
            Update your shop's information. Your username cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <div className="space-y-4">
                     <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" defaultValue={shopProfileData.username} disabled />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="contact-person">Contact Person</Label>
                        <Input id="contact-person" defaultValue={shopProfileData.contactPerson} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contact-phone">Contact Phone</Label>
                        <Input id="contact-phone" defaultValue={shopProfileData.contactPhone} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" defaultValue={shopProfileData.city} />
                    </div>
                </div>
                {/* Column 2 */}
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="exact-location">Exact Location</Label>
                        <Textarea id="exact-location" defaultValue={shopProfileData.exactLocation} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="trade-license">Trade License Number</Label>
                        <Input id="trade-license" defaultValue={shopProfileData.tradeLicenseNumber} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tin-number">TIN Number</Label>
                        <Input id="tin-number" defaultValue={shopProfileData.tinNumber} />
                    </div>
                </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
