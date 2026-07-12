import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  User as UserIcon, 
  Search,
  ShieldAlert
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("email", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async (user: UserProfile) => {
    if (updatingIds[user.uid]) return;

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    
    // UI Confirmation is better but window.confirm is unreliable in iframes
    setUpdatingIds(prev => ({ ...prev, [user.uid]: true }));

    try {
      await updateDoc(doc(db, "users", user.uid), {
        role: newRole
      });
      toast.success(`Rol de ${user.email} actualizado a ${newRole === 'admin' ? 'Administrador' : 'Usuario'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error("Error al actualizar el rol");
    } finally {
      setUpdatingIds(prev => ({ ...prev, [user.uid]: false }));
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <p className="text-slate-500 text-sm italic">Otorga o revoca permisos de administrador a los miembros registrados.</p>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por email o nombre..." 
            className="pl-9 h-10 border-slate-200 focus:border-blue-500 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Usuario</TableHead>
                <TableHead className="font-semibold text-slate-700">Rol Actual</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-400">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-400">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 border border-blue-200">
                          {user.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.displayName || "Sin nombre"}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Administrador
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 border-slate-200">
                          <UserIcon className="w-3 h-3 mr-1" />
                          Usuario
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={user.role === 'admin' ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleRole(user)}
                        disabled={updatingIds[user.uid]}
                        className={user.role === 'admin' ? "text-slate-600 border-slate-200" : "bg-blue-600 hover:bg-blue-700"}
                      >
                        {updatingIds[user.uid] ? (
                          "Actualizando..."
                        ) : user.role === 'admin' ? (
                          <>
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Quitar Admin
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Hacer Admin
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
        <ShieldCheck className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-1">Nota importante sobre accesos:</p>
          <p>Para que un usuario aparezca en esta lista, primero debe haber iniciado sesión al menos una vez en la aplicación. Una vez que su perfil sea creado automáticamente, podrás cambiarle el rol a Administrador.</p>
        </div>
      </div>
    </div>
  );
}
