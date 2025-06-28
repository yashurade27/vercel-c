import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, UploadCloud, ExternalLink } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [projectUrl, setProjectUrl] = useState("");
  const deploymentIdRef = useRef("");

  const BACKEND_UPLOAD_URL = "http://localhost:3000";

  const handleDeploy = async () => {
    if (!repoUrl.trim()) return;

    setUploading(true);
    setDeployed(false);
    setUploadId("");
    setProjectUrl("");
    deploymentIdRef.current = "";

    toast("Deployment started", {
      description: "Hang tight, deploying your project...",
    });

    try {
      const res = await axios.post(`${BACKEND_UPLOAD_URL}/deploy`, {
        repoUrl: repoUrl,
      });
      deploymentIdRef.current = res.data.id;
      setUploadId(res.data.id);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong", {
        description: "Please try again later.",
      });
      setUploading(false);
    }
  };

useEffect(() => {
  if (!uploadId) return;

  const interval = setInterval(async () => {
    try {
      const response = await axios.get(
        `${BACKEND_UPLOAD_URL}/status?id=${uploadId}`,
        { timeout: 5000 } 
      );
            
      if (response.data.status === "deployed") {
        clearInterval(interval);
        setDeployed(true);
        setUploading(false);
        setProjectUrl(response.data.url); 
        toast.success("Deployed Successfully!");
      } else if (response.data.status === "error") {
        clearInterval(interval);
        setUploading(false);
        toast.error("Deployment Failed");
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 3000);

  return () => clearInterval(interval);
}, [uploadId]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <Card className="w-full max-w-xl bg-[#111111] border border-[#222] shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          {!deployed ? (
            <>
              <h1 className="text-3xl font-semibold text-center text-white">
                Deploy Your GitHub Repo
              </h1>
              <p className="text-gray-400 text-center text-sm">
                Paste your GitHub URL down below to make your project live!
              </p>

              <Input
                type="url"
                placeholder="https://github.com/your/repo"
                className="bg-[#1a1a1a] border border-[#333] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-500 text-white"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />

              <Button
                onClick={handleDeploy}
                className="w-full bg-white text-black hover:bg-gray-200 transition"
                disabled={uploading || !repoUrl.trim()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Deploy
                  </>
                )}
              </Button>

              {uploadId && (
                <div className="text-center text-sm text-gray-400">
                  Upload ID:{" "}
                  <span className="text-white font-mono">{uploadId}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle2 className="text-green-500 w-12 h-12" />
                <h2 className="text-xl font-semibold text-center text-white">
                  Deployed Successfully
                </h2>
                <p className="text-gray-400 text-sm text-center">
                  Your project is live here:
                </p>
                {projectUrl && (
                  <a
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white bg-white/10 px-4 py-2 rounded-md hover:bg-white/20 transition flex items-center gap-2"
                  >
                    Visit Website <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
