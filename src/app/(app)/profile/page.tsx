import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/contexts/auth-context';

// In a real implementation, this data would be fetched from the database
// based on the authenticated factory user
const factoryProfileData = {
  name: "Carement",
  address: "123 Industrial Zone, Addis Ababa, Ethiopia",
  contactPerson: "Factory Manager",
  contactPhone: "+251 911 123 456",
};

export default function FactoryProfilePage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Factory Profile</h1>
        <Button>Save Changes</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Factory Details</CardTitle>
          <CardDescription>
            Manage your factory's information here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
           <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="factory-name">Factory Name</Label>
                    <Input id="factory-name" defaultValue={factoryProfileData.name} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="contact-person">Contact Person</Label>
                    <Input id="contact-person" defaultValue={factoryProfileData.contactPerson} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input id="contact-phone" defaultValue={factoryProfileData.contactPhone} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" defaultValue={factoryProfileData.address} />
                </div>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}