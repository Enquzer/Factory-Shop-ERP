
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

// Mock data based on the XML specification for a factory profile
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
