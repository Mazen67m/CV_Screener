namespace CVScreener.Infrastructure.Helpers;

/// <summary>
/// Robustly resolves file paths across various execution environments:
/// Docker (/app), local dotnet run, Visual Studio, and test runners.
/// </summary>
public static class PathResolver
{
    public static string Resolve(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return path;

        if (Path.IsPathRooted(path) && File.Exists(path))
            return path;

        // Candidate 1: relative to current working directory
        var currentDirCandidate = Path.GetFullPath(path, Directory.GetCurrentDirectory());
        if (File.Exists(currentDirCandidate))
            return currentDirCandidate;

        // Candidate 2: relative to AppContext.BaseDirectory
        var baseDirCandidate = Path.GetFullPath(path, AppContext.BaseDirectory);
        if (File.Exists(baseDirCandidate))
            return baseDirCandidate;

        // Candidate 3: search upwards from BaseDirectory and CurrentDirectory for repo/app root
        var searchRoots = new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory };
        foreach (var root in searchRoots)
        {
            var dir = new DirectoryInfo(root);
            for (var i = 0; i < 6 && dir != null; i++)
            {
                var combined = Path.Combine(dir.FullName, path.TrimStart('/', '\\'));
                if (File.Exists(combined))
                    return combined;

                // Also check if path starts with ml/ or similar
                var filenameOnly = Path.GetFileName(path);
                var subfolder = Path.GetDirectoryName(path)?.TrimStart('/', '\\');
                if (!string.IsNullOrEmpty(subfolder))
                {
                    var subCombined = Path.Combine(dir.FullName, subfolder, filenameOnly);
                    if (File.Exists(subCombined))
                        return subCombined;
                }

                dir = dir.Parent;
            }
        }

        // Fallback to current dir candidate
        return currentDirCandidate;
    }
}
